"""Public-demo feature flag. Safe to import from settings and views."""

from __future__ import annotations

from vaultbox.host_env import env_bool


UPLOADS_DISABLED = 'File uploads are disabled on the public demo.'


def enabled() -> bool:
    from django.conf import settings
    return bool(getattr(settings, 'VAULTBOX_PUBLIC_DEMO', env_bool('VAULTBOX_PUBLIC_DEMO', False)))


def deny_file_uploads() -> None:
    from rest_framework.exceptions import PermissionDenied
    if enabled():
        raise PermissionDenied(UPLOADS_DISABLED)


def reset_seconds() -> int:
    from django.conf import settings
    raw = getattr(settings, 'VAULTBOX_DEMO_RESET_SECONDS', 1800)
    try:
        value = int(raw)
    except (TypeError, ValueError):
        value = 1800
    return max(60, value)
