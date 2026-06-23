"""Rules for user account lifecycle."""

from rest_framework.exceptions import ValidationError

from .models import UserGlobalRole, VaultBoxRole


def validate_user_deletion(user) -> None:
    try:
        if user.global_role.role == VaultBoxRole.FULL_ADMIN:
            remaining = UserGlobalRole.objects.filter(role=VaultBoxRole.FULL_ADMIN).exclude(user_id=user.id).count()
            if remaining == 0:
                raise ValidationError('Cannot delete the last Full Admin user')
    except UserGlobalRole.DoesNotExist:
        pass