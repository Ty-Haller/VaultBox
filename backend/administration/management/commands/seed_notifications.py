from django.core.management.base import BaseCommand

from administration.notification_service import reset_notification_catalog, seed_role_notification_defaults


class Command(BaseCommand):
    help = 'Seed or reset notification catalog and role defaults'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Reset catalog to system defaults')

    def handle(self, *args, **options):
        if options['reset']:
            n = reset_notification_catalog()
            self.stdout.write(self.style.SUCCESS(f'Reset {n} notification catalog entries'))
        else:
            from administration.models import NotificationOption
            if NotificationOption.objects.exists():
                self.stdout.write('Notification catalog already exists; use --reset to replace')
            else:
                n = reset_notification_catalog()
                self.stdout.write(self.style.SUCCESS(f'Seeded {n} notification catalog entries'))
        r = seed_role_notification_defaults()
        self.stdout.write(self.style.SUCCESS(f'Seeded {r} role notification defaults'))