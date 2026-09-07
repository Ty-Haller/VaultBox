from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from administration.models import UserProfile
from accounts.access import get_user_access
from accounts.models import PasskeyCredential, UserGlobalRole, UserSiteRole, UserVaultRole, VaultBoxRole
from accounts.scoping import can_write_inventory
from inventory.models import Site, Vault
from public_demo.flags import enabled
from public_demo.reset import reset_public_demo
from public_demo.state import next_reset_at


def _admin():
    user = User.objects.create_user('admin')
    user.set_unusable_password()
    user.save()
    UserGlobalRole.objects.create(user=user, role=VaultBoxRole.FULL_ADMIN)
    UserProfile.objects.create(user=user, display_name='Administrator', is_admin=True)
    return user


class PublicDemoOffTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_flag_defaults_off(self):
        self.assertFalse(enabled())

    def test_demo_status_off(self):
        res = self.client.get('/api/demo-status/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['publicDemo'], False)
        self.assertIsNone(res.json()['nextResetAt'])

    def test_demo_session_404_when_off(self):
        _admin()
        res = self.client.post('/api/auth/demo-session/')
        self.assertEqual(res.status_code, 404)

    def test_bootstrap_available_when_off(self):
        _admin()
        res = self.client.post('/api/auth/passkey/bootstrap/begin/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['reason'], 'first_boot')


@override_settings(VAULTBOX_PUBLIC_DEMO=True, VAULTBOX_DEMO_RESET_SECONDS=120)
class PublicDemoOnTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = _admin()

    def test_flag_on(self):
        self.assertTrue(enabled())

    def test_demo_status_shape(self):
        res = self.client.get('/api/demo-status/')
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertTrue(body['publicDemo'])
        self.assertEqual(body['resetsEverySeconds'], 120)
        self.assertTrue(body['nextResetAt'])
        self.assertIn('resetting', body)
        self.assertFalse(body['resetting'])

    def test_demo_session_logs_in_admin(self):
        res = self.client.post('/api/auth/demo-session/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['username'], 'admin')
        me = self.client.get('/api/auth/me/')
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()['username'], 'admin')
        self.assertTrue(me.json()['permissions']['isFullAdmin'])

    def test_bootstrap_403_when_on(self):
        res = self.client.post('/api/auth/passkey/bootstrap/begin/')
        self.assertEqual(res.status_code, 403)
        res = self.client.post('/api/auth/passkey/bootstrap/finish/', {'credential': {}}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_hostname_patch_403(self):
        self.client.force_login(self.admin)
        res = self.client.patch('/api/admin/site/', {'hostname': 'evil.example.com'}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_backups_disabled(self):
        self.client.force_login(self.admin)
        res = self.client.get('/api/admin/backups/')
        self.assertEqual(res.status_code, 200)
        res = self.client.post('/api/admin/backups/', {'includeMedia': False}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_sso_patch_403(self):
        self.client.force_login(self.admin)
        res = self.client.patch('/api/admin/sso/', {'providers': []}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_seed_confirm_is_case_sensitive(self):
        self.client.force_login(self.admin)
        res = self.client.post('/api/seed/', {'confirm': 'reset'}, format='json')
        self.assertEqual(res.status_code, 400)
        res = self.client.post('/api/seed/', {'confirm': 'RESET'}, format='json')
        self.assertEqual(res.status_code, 200)

    def test_reset_drops_visitors_and_restores_seed(self):
        visitor = User.objects.create_user('demo-abcd')
        PasskeyCredential.objects.create(
            user=visitor, name='k', credential_id='cred', public_key='pk', rp_id='localhost',
        )
        reset_public_demo()
        self.assertFalse(User.objects.filter(username='demo-abcd').exists())
        self.assertFalse(PasskeyCredential.objects.exists())
        self.assertTrue(User.objects.filter(username='admin').exists())
        self.assertTrue(Site.objects.exists())
        self.assertTrue(
            UserGlobalRole.objects.filter(user__username='admin', role=VaultBoxRole.FULL_ADMIN).exists()
        )
        nxt = next_reset_at()
        self.assertIsNotNone(nxt)
        self.assertGreater(nxt, timezone.now())

    def test_raising_global_role_allows_writes(self):
        call_command('seed_data')
        visitor = User.objects.create_user('demo-role')
        UserGlobalRole.objects.create(user=visitor, role=VaultBoxRole.VIEWER)
        for site in Site.objects.all():
            UserSiteRole.objects.create(user=visitor, site=site, role=VaultBoxRole.VIEWER)
        for vault in Vault.objects.all():
            UserVaultRole.objects.create(user=visitor, vault=vault, role=VaultBoxRole.VIEWER)
        self.assertFalse(can_write_inventory(visitor))

        UserGlobalRole.objects.filter(user=visitor).update(role=VaultBoxRole.VAULT_ADMIN)
        visitor.refresh_from_db()
        visitor = User.objects.get(pk=visitor.pk)
        self.assertTrue(can_write_inventory(visitor))
        access = get_user_access(visitor)
        vault = Vault.objects.first()
        self.assertEqual(access.effective_vault_role(str(vault.id), str(vault.site_id)), VaultBoxRole.VAULT_ADMIN)

    def test_reset_command_requires_flag(self):
        call_command('reset_public_demo')

    @patch('administration.notification_service.send_notification_email')
    @patch('administration.notification_service._send_apprise')
    def test_notifications_skip_email_and_apprise(self, send_apprise, send_email):
        from administration.models import NotificationOption
        from administration.notification_service import emit

        NotificationOption.objects.create(
            event_type='user_created',
            name='User created',
            slug='user-created',
            category='admin',
            enabled=True,
            email_notify=True,
            in_app_notify=True,
            apprise_notify=True,
        )
        self.admin.email = 'admin@example.com'
        self.admin.save()
        UserProfile.objects.filter(user=self.admin).update(apprise_urls=['https://ntfy.sh/test'])
        emit('user_created', title='t', message='m')
        send_email.assert_not_called()
        send_apprise.assert_not_called()


@override_settings(VAULTBOX_PUBLIC_DEMO=False)
class ResetCommandOffTests(TestCase):
    def test_command_refuses_when_off(self):
        from django.core.management.base import CommandError
        with self.assertRaises(CommandError):
            call_command('reset_public_demo')
