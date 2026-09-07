from django.test import SimpleTestCase

from administration.notification_service import _deliver_apprise_url, _is_cloud_metadata_url


class CloudMetadataUrlTests(SimpleTestCase):
    def test_blocks_known_metadata_hosts(self):
        self.assertTrue(_is_cloud_metadata_url('http://169.254.169.254/latest/meta-data/'))
        self.assertTrue(_is_cloud_metadata_url('http://metadata.google.internal/'))
        self.assertTrue(_is_cloud_metadata_url('http://metadata.google.internal./computeMetadata/v1/'))
        self.assertTrue(_is_cloud_metadata_url('http://[fd00:ec2::254]/latest/meta-data/'))
        self.assertTrue(_is_cloud_metadata_url('json://169.254.169.254/latest/meta-data/'))

    def test_allows_normal_and_localhost(self):
        self.assertFalse(_is_cloud_metadata_url('https://ntfy.sh/vaultbox'))
        self.assertFalse(_is_cloud_metadata_url('http://127.0.0.1:8000/hook'))
        self.assertFalse(_is_cloud_metadata_url('http://10.0.0.5:8080/hook'))
        self.assertFalse(_is_cloud_metadata_url('http://192.168.1.10/notify'))

    def test_deliver_blocks_metadata_without_fetch(self):
        ok, err = _deliver_apprise_url('http://169.254.169.254/latest/meta-data/', 't', 'b')
        self.assertFalse(ok)
        self.assertEqual(err, 'This URL is not allowed.')
