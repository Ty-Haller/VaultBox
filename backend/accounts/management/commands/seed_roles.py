from django.core.management.base import BaseCommand
from django.utils.text import slugify

from accounts.models import Role
from accounts.permissions_catalog import DEFAULT_ROLE_PERMISSIONS


class Command(BaseCommand):
    help = 'Seed default VaultBox roles with permissions'

    def handle(self, *args, **options):
        labels = {
            'full_admin': 'Full Admin',
            'site_admin': 'Site Admin',
            'vault_admin': 'Vault Admin',
            'viewer': 'Viewer',
            'audit_reporting': 'Audit & Reporting',
        }
        for i, (slug, perms) in enumerate(DEFAULT_ROLE_PERMISSIONS.items()):
            Role.objects.update_or_create(
                slug=slug,
                defaults={
                    'name': labels.get(slug, slug),
                    'description': f'VaultBox {labels.get(slug, slug)} role',
                    'permissions': perms,
                    'is_system': True,
                    'sort_order': i,
                },
            )
        self.stdout.write(self.style.SUCCESS(f'Seeded {len(DEFAULT_ROLE_PERMISSIONS)} roles'))