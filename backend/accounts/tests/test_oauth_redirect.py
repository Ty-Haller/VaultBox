from django.test import SimpleTestCase

from accounts.oauth_service import safe_post_login_path


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
