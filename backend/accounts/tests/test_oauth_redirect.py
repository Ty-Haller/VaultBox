from unittest.mock import patch
from urllib.parse import urlparse

from django.test import RequestFactory, SimpleTestCase, override_settings

from accounts.oauth_service import frontend_redirect, safe_post_login_path


class SafePostLoginPathTests(SimpleTestCase):
    def test_allows_relative_paths(self):
        self.assertEqual(safe_post_login_path('/'), '/')
        self.assertEqual(safe_post_login_path('/settings'), '/settings')
        self.assertEqual(safe_post_login_path('/vaults?tab=1'), '/vaults?tab=1')

    def test_rejects_protocol_relative_and_absolute(self):
        self.assertEqual(safe_post_login_path('//evil.com'), '/')
        self.assertEqual(safe_post_login_path('https://evil.com'), '/')
        self.assertEqual(safe_post_login_path('http://evil.com/x'), '/')
        self.assertEqual(safe_post_login_path('/\\evil.com'), '/')
        self.assertEqual(safe_post_login_path('/javascript:alert(1)'), '/')
        self.assertEqual(safe_post_login_path('/data:text/html,x'), '/')
        self.assertEqual(safe_post_login_path('settings'), '/')

    def test_fallback(self):
        self.assertEqual(safe_post_login_path('', fallback='/settings'), '/settings')
        self.assertEqual(safe_post_login_path(None, fallback='/settings'), '/settings')
        self.assertEqual(safe_post_login_path('//evil.com', fallback='/settings'), '/settings')


class FrontendRedirectTests(SimpleTestCase):
    def setUp(self):
        self.request = RequestFactory().get('/api/auth/oauth/google/callback/')

    @override_settings(ALLOWED_HOSTS=['localhost', '127.0.0.1'])
    @patch('administration.site_config.get_frontend_base_url', return_value='http://localhost:5173')
    def test_stays_on_allowed_frontend_host(self, _mock_base):
        resp = frontend_redirect(self.request, '/settings')
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(resp.url, 'http://localhost:5173/settings')

    @override_settings(ALLOWED_HOSTS=['localhost', '127.0.0.1'])
    @patch('administration.site_config.get_frontend_base_url', return_value='http://localhost:5173')
    def test_query_flags_kept(self, _mock_base):
        resp = frontend_redirect(self.request, '/login?oauth_error=1')
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(resp.url, 'http://localhost:5173/login?oauth_error=1')

    @override_settings(ALLOWED_HOSTS=['localhost'])
    @patch('administration.site_config.get_frontend_base_url', return_value='http://evil.example/phish')
    def test_falls_back_to_relative_when_host_not_allowed(self, _mock_base):
        resp = frontend_redirect(self.request, '/settings')
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(resp.url, '/settings')
        self.assertFalse(urlparse(resp.url).netloc)
