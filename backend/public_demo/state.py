"""Persist the current demo wipe deadline."""

from __future__ import annotations

import json
from datetime import timedelta

from django.db.utils import OperationalError, ProgrammingError
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from administration.models import AppSetting

from .flags import reset_seconds

SETTING_KEY = 'public_demo_state'


def _load() -> dict:
    try:
        row = AppSetting.objects.filter(key=SETTING_KEY).first()
    except (OperationalError, ProgrammingError):
        return {}
    if not row or not row.value:
        return {}
    try:
        data = json.loads(row.value)
    except (json.JSONDecodeError, TypeError):
        return {}
    return data if isinstance(data, dict) else {}


def _save(data: dict) -> dict:
    AppSetting.objects.update_or_create(
        key=SETTING_KEY,
        defaults={
            'value': json.dumps(data),
            'value_type': 'json',
            'category': 'demo',
            'description': 'Public demo wipe cycle',
        },
    )
    return data


def next_reset_at():
    raw = _load().get('nextResetAt')
    if not raw:
        return None
    dt = parse_datetime(str(raw))
    if dt is None:
        return None
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    return dt


def ensure_deadline():
    """Set nextResetAt if missing. Returns the aware datetime or None if DB is not ready."""
    try:
        current = next_reset_at()
        if current is not None:
            return current
        nxt = timezone.now() + timedelta(seconds=reset_seconds())
        _save({'nextResetAt': nxt.isoformat(), 'resetsEverySeconds': reset_seconds()})
        return nxt
    except (OperationalError, ProgrammingError):
        return None


def bump_deadline():
    nxt = timezone.now() + timedelta(seconds=reset_seconds())
    _save({'nextResetAt': nxt.isoformat(), 'resetsEverySeconds': reset_seconds()})
    return nxt


def status_payload() -> dict:
    from .flags import enabled
    if not enabled():
        return {
            'publicDemo': False,
            'resetsEverySeconds': 0,
            'nextResetAt': None,
            'resetting': False,
        }
    nxt = ensure_deadline()
    now = timezone.now()
    resetting = bool(nxt and nxt <= now)
    return {
        'publicDemo': True,
        'resetsEverySeconds': reset_seconds(),
        'nextResetAt': nxt.isoformat() if nxt else None,
        'resetting': resetting,
    }
