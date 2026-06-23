"""Reset passkey auth so the login-page bootstrap flow can run again."""

from django.contrib.auth.models import Group, User
from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import PasskeyCredential, UserGlobalRole, VaultBoxRole
from administration.models import UserProfile


class Command(BaseCommand):
    help = 'Clear passkeys and ensure an admin account exists for passkey bootstrap'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            default='admin',
            help='Bootstrap target username (default: admin)',
        )

    def handle(self, *args, **options):
        username = options['username']
        deleted_passkeys, _ = PasskeyCredential.objects.all().delete()
        self.stdout.write(f'Removed {deleted_passkeys} passkey(s)')

        admin_group, _ = Group.objects.get_or_create(name='Administrators')
        user = User.objects.filter(username=username).first()
        if user is None:
            user = User.objects.create_user(username=username, email=f'{username}@vaultbox.local')
            user.set_unusable_password()
            self.stdout.write(f'Created user "{username}"')

        user.is_active = True
        user.is_superuser = True
        user.is_staff = True
        user.save()
        user.groups.add(admin_group)

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.display_name = profile.display_name or 'Administrator'
        profile.is_admin = True
        profile.save(update_fields=['display_name', 'is_admin'])

        UserGlobalRole.objects.update_or_create(
            user=user,
            defaults={'role': VaultBoxRole.FULL_ADMIN},
        )

        # Ensure bootstrap targets this account, not an older test user.
        earliest = User.objects.order_by('date_joined').values_list('date_joined', flat=True).first()
        if earliest:
            user.date_joined = earliest - timezone.timedelta(days=1)
            user.save(update_fields=['date_joined'])

        self.stdout.write(self.style.SUCCESS(
            f'Bootstrap ready for "{username}". Open the login page and register an admin passkey.'
        ))