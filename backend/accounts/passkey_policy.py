"""Rules for when a passkey credential may be removed."""

from rest_framework.exceptions import ValidationError

from .models import PasskeyCredential, UserGlobalRole, VaultBoxRole


def validate_passkey_deletion(passkey: PasskeyCredential) -> None:
    user = passkey.user
    rp_id = passkey.rp_id

    if PasskeyCredential.objects.filter(user=user, rp_id=rp_id).count() <= 1:
        raise ValidationError('Cannot delete your only passkey for this host')

    if PasskeyCredential.objects.filter(rp_id=rp_id).count() <= 1:
        raise ValidationError('Cannot delete the last passkey for this host')

    try:
        if user.global_role.role == VaultBoxRole.FULL_ADMIN:
            full_admin_ids = list(
                UserGlobalRole.objects.filter(role=VaultBoxRole.FULL_ADMIN).values_list('user_id', flat=True)
            )
            admins_with_passkeys_after = (
                PasskeyCredential.objects.filter(user_id__in=full_admin_ids, rp_id=rp_id)
                .exclude(pk=passkey.pk)
                .values('user_id')
                .distinct()
                .count()
            )
            if admins_with_passkeys_after == 0:
                raise ValidationError('Cannot delete the last Full Admin passkey for this host')
    except UserGlobalRole.DoesNotExist:
        pass
