from unittest.mock import patch

from django.test import SimpleTestCase

from vaultbox.host_env import (
    backend_base_url,
    frontend_base_url,
    hosts_and_origins,
    is_dev_hostname,
    normalize_hostname,
    rp_id_for,
    validate_hostname,
)


class HostEnvTests(SimpleTestCase):
    def test_normalize_strips_scheme_and_port(self):
        self.assertEqual(normalize_hostname('https://Vault.Example.com:8443/path'), 'vault.example.com')

    def test_rp_id_maps_loopback_to_localhost(self):
        self.assertEqual(rp_id_for('127.0.0.1'), 'localhost')
        self.assertEqual(rp_id_for('vault.home.arpa'), 'vault.home.arpa')

    def test_dev_urls_keep_vite_and_django_ports(self):
        self.assertEqual(frontend_base_url('localhost', False), 'http://localhost:5173')
        self.assertEqual(backend_base_url('localhost', False), 'http://127.0.0.1:8000')

    def test_public_https_urls(self):
        self.assertEqual(frontend_base_url('vault.example.com', True), 'https://vault.example.com')
        self.assertEqual(backend_base_url('vault.example.com', True), 'https://vault.example.com')

    def test_allowed_hosts_always_include_loopback(self):
        hosts, origins = hosts_and_origins('vault.example.com', True)
        self.assertIn('localhost', hosts)
        self.assertIn('127.0.0.1', hosts)
        self.assertIn('vault.example.com', hosts)
        self.assertIn('https://vault.example.com', origins)
        self.assertIn('http://localhost:5173', origins)

    def test_invalid_hostname_rejected(self):
        with self.assertRaises(ValueError):
            validate_hostname('not a host')

    def test_dev_hostname_suffix(self):
        self.assertTrue(is_dev_hostname('app.localhost'))
        self.assertFalse(is_dev_hostname('vault.example.com'))

    def test_single_origin_uses_public_port(self):
        env = {
            'VAULTBOX_SINGLE_ORIGIN': 'true',
            'VAULTBOX_HTTP_PORT': '8000',
        }
        with patch.dict('os.environ', env, clear=False):
            self.assertEqual(frontend_base_url('localhost', False), 'http://localhost:8000')
            self.assertEqual(backend_base_url('localhost', False), 'http://localhost:8000')
            self.assertEqual(rp_id_for('localhost'), 'localhost')
            _, origins = hosts_and_origins('localhost', False)
            self.assertIn('http://localhost:8000', origins)
