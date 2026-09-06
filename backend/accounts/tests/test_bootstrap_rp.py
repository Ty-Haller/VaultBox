from django.contrib.auth.models import User
from django.test import TestCase

from accounts.models import PasskeyCredential, UserGlobalRole, VaultBoxRole
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
