from django.core.management.base import BaseCommand, CommandError

from public_demo.flags import enabled
from public_demo.reset import reset_public_demo


class Command(BaseCommand):
    help = 'Wipe and reseed the public demo (visitor users, passkeys, inventory).'

    def handle(self, *args, **options):
        if not enabled():
            raise CommandError('VAULTBOX_PUBLIC_DEMO is not enabled')
        reset_public_demo()
        self.stdout.write(self.style.SUCCESS('Public demo reset complete'))
