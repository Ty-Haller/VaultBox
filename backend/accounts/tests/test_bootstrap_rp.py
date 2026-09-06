from django.contrib.auth.models import User
from django.test import TestCase

from accounts.models import PasskeyCredential, UserGlobalRole, VaultBoxRole
from accounts.stale_passkeys import StalePasskeyError, purge_stale_passkeys, stale_passkey_summary
from accounts.views import _bootstrap_reason


class _Req:
    def __init__(self, host: str):
        self.META = {'HTTP_HOST': host}


class BootstrapRpIdTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('admin')
        UserGlobalRole.objects.create(user=self.user, role=VaultBoxRole.FULL_ADMIN)

    def test_first_boot_when_no_passkeys(self):
        self.assertEqual(_bootstrap_reason(_Req('localhost')), 'first_boot')

    def test_blocked_when_key_exists_for_this_host(self):
        PasskeyCredential.objects.create(
            user=self.user,
            name='Old',
            credential_id='cred-local',
            public_key='pk',
            rp_id='localhost',
        )
        self.assertIsNone(_bootstrap_reason(_Req('localhost')))

    def test_rp_id_change_reopens_bootstrap(self):
        PasskeyCredential.objects.create(
            user=self.user,
            name='Old',
            credential_id='cred-local',
            public_key='pk',
            rp_id='localhost',
        )
        self.assertEqual(_bootstrap_reason(_Req('vault.example.com')), 'rp_id_change')


class StalePasskeyPurgeTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('admin')
        PasskeyCredential.objects.create(
            user=self.user, name='Old', credential_id='old', public_key='pk', rp_id='localhost',
        )
        PasskeyCredential.objects.create(
            user=self.user, name='New', credential_id='new', public_key='pk2', rp_id='vault.example.com',
        )

    def test_summary_counts_old_hosts(self):
        summary = stale_passkey_summary(_Req('vault.example.com'))
        self.assertEqual(summary['currentRpId'], 'vault.example.com')
        self.assertEqual(summary['currentCount'], 1)
        self.assertEqual(summary['staleCount'], 1)
        self.assertEqual(summary['staleByRpId'], [{'rpId': 'localhost', 'count': 1}])

    def test_purge_keeps_current_host_keys(self):
        result = purge_stale_passkeys(_Req('vault.example.com'))
        self.assertEqual(result['deleted'], 1)
        self.assertEqual(result['staleCount'], 0)
        self.assertTrue(PasskeyCredential.objects.filter(rp_id='vault.example.com').exists())
        self.assertFalse(PasskeyCredential.objects.filter(rp_id='localhost').exists())

    def test_purge_refuses_if_current_host_has_no_keys(self):
        PasskeyCredential.objects.filter(rp_id='vault.example.com').delete()
        with self.assertRaises(StalePasskeyError):
            purge_stale_passkeys(_Req('vault.example.com'))
        self.assertTrue(PasskeyCredential.objects.filter(rp_id='localhost').exists())
