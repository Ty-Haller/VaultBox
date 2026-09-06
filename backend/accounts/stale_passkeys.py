"""Cleanup passkeys registered for a previous WebAuthn RP ID."""

from __future__ import annotations

from django.db.models import Count

from .models import PasskeyCredential
from .webauthn_service import current_rp_id


class StalePasskeyError(ValueError):
    pass


def stale_passkey_summary(request=None) -> dict:
    rp_id = current_rp_id(request)
    current = PasskeyCredential.objects.filter(rp_id=rp_id)
    stale = PasskeyCredential.objects.exclude(rp_id=rp_id)
    by_rp = (
        stale.values('rp_id')
        .annotate(count=Count('id'))
        .order_by('rp_id')
    )
    return {
        'currentRpId': rp_id,
        'currentCount': current.count(),
        'staleCount': stale.count(),
        'staleByRpId': [{'rpId': row['rp_id'], 'count': row['count']} for row in by_rp],
    }


def purge_stale_passkeys(request=None) -> dict:
    summary = stale_passkey_summary(request)
    if summary['staleCount'] == 0:
        return {**summary, 'deleted': 0}
    if summary['currentCount'] == 0:
        raise StalePasskeyError(
            'Enroll a passkey for this host first. Removing old keys would leave no credentials if you revert.'
        )
    deleted, _ = PasskeyCredential.objects.exclude(rp_id=summary['currentRpId']).delete()
    after = stale_passkey_summary(request)
    return {**after, 'deleted': deleted}
