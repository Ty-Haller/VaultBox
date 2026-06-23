import base64
import json
from typing import Any

from django.conf import settings
from django.contrib.auth.models import User
from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers import bytes_to_base64url, base64url_to_bytes, options_to_json_dict
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from administration.models import UserProfile

from .models import PasskeyCredential


def _rp_id(request=None) -> str:
    try:
        from administration.site_config import get_webauthn_rp_id
        return get_webauthn_rp_id(request)
    except Exception:
        return getattr(settings, 'WEBAUTHN_RP_ID', 'localhost')


def _rp_name() -> str:
    return getattr(settings, 'WEBAUTHN_RP_NAME', 'VaultBox')


def _origin(request=None) -> str:
    try:
        from administration.site_config import get_webauthn_origin
        return get_webauthn_origin(request)
    except Exception:
        return getattr(settings, 'WEBAUTHN_ORIGIN', settings.FRONTEND_BASE_URL)


def _store_challenge(request, key: str, value: Any) -> None:
    request.session[f'webauthn_{key}'] = value
    request.session.modified = True


def _pop_challenge(request, key: str) -> Any:
    return request.session.pop(f'webauthn_{key}', None)


def registration_options(request, user: User) -> dict:
    existing = PasskeyCredential.objects.filter(user=user)
    exclude = [
        PublicKeyCredentialDescriptor(id=base64url_to_bytes(pk.credential_id))
        for pk in existing
    ]
    options = generate_registration_options(
        rp_id=_rp_id(request),
        rp_name=_rp_name(),
        user_id=str(user.pk).encode(),
        user_name=user.username,
        user_display_name=(UserProfile.objects.filter(user=user).values_list('display_name', flat=True).first() or user.username),
        exclude_credentials=exclude,
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.PREFERRED,
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
    )
    _store_challenge(request, 'reg_challenge', bytes_to_base64url(options.challenge))
    _store_challenge(request, 'reg_user_id', user.pk)
    return options_to_json_dict(options)


def verify_registration(request, user: User, credential: dict, name: str = 'Passkey') -> PasskeyCredential:
    challenge_b64 = _pop_challenge(request, 'reg_challenge')
    expected_user_id = _pop_challenge(request, 'reg_user_id')
    if expected_user_id != user.pk:
        raise ValueError('Registration session mismatch')
    verification = verify_registration_response(
        credential=credential,
        expected_challenge=base64url_to_bytes(challenge_b64),
        expected_rp_id=_rp_id(request),
        expected_origin=_origin(request),
        require_user_verification=False,
    )
    return PasskeyCredential.objects.create(
        user=user,
        name=name or 'Passkey',
        credential_id=bytes_to_base64url(verification.credential_id),
        public_key=bytes_to_base64url(verification.credential_public_key),
        sign_count=verification.sign_count,
        aaguid=str(verification.aaguid) if verification.aaguid else '',
    )


def authentication_options(request, username: str | None = None) -> dict:
    allow_credentials = []
    user = None
    if username:
        user = User.objects.filter(username=username, is_active=True).first()
        if user:
            for pk in PasskeyCredential.objects.filter(user=user):
                allow_credentials.append(
                    PublicKeyCredentialDescriptor(id=base64url_to_bytes(pk.credential_id))
                )
    options = generate_authentication_options(
        rp_id=_rp_id(request),
        allow_credentials=allow_credentials or None,
        user_verification=UserVerificationRequirement.PREFERRED,
    )
    _store_challenge(request, 'auth_challenge', bytes_to_base64url(options.challenge))
    if user:
        _store_challenge(request, 'auth_user_id', user.pk)
    return options_to_json_dict(options)


def verify_authentication(request, credential: dict) -> User:
    challenge_b64 = _pop_challenge(request, 'auth_challenge')
    cred_id = credential.get('id') or credential.get('rawId')
    if isinstance(cred_id, str):
        cred_id_b64 = cred_id
    else:
        cred_id_b64 = base64.b64encode(cred_id).decode()
    stored = PasskeyCredential.objects.select_related('user').filter(credential_id=cred_id_b64).first()
    if not stored:
        raise ValueError('Unknown passkey')
    verification = verify_authentication_response(
        credential=credential,
        expected_challenge=base64url_to_bytes(challenge_b64),
        expected_rp_id=_rp_id(request),
        expected_origin=_origin(request),
        credential_public_key=base64url_to_bytes(stored.public_key),
        credential_current_sign_count=stored.sign_count,
        require_user_verification=False,
    )
    from django.utils import timezone
    stored.sign_count = verification.new_sign_count
    stored.last_used_at = timezone.now()
    stored.save(update_fields=['sign_count', 'last_used_at'])
    return stored.user