"""Permission-derived baseline: which event types each role may receive."""

from __future__ import annotations

from .notification_catalog import (
    ACTIVITY_EVENT_TYPES,
    ADMIN_EVENT_TYPES,
    ASSET_EVENT_TYPES,
    AUDIT_EVENT_TYPES,
    MARKET_EVENT_TYPES,
    NOTIFICATION_DEFAULTS,
)

VAULTBOX_ROLES = [
    'full_admin',
    'site_admin',
    'vault_admin',
    'viewer',
    'audit_reporting',
]

ALL_EVENT_TYPES = [row[0] for row in NOTIFICATION_DEFAULTS]


def _events_for_permissions(permissions: set[str], is_full_admin: bool) -> set[str]:
    if is_full_admin:
        return set(ALL_EVENT_TYPES)

    allowed: set[str] = set()
    if 'run_audits' in permissions:
        allowed |= AUDIT_EVENT_TYPES
    if 'manage_users' in permissions or 'manage_roles' in permissions:
        allowed |= ADMIN_EVENT_TYPES
    if 'view_inventory' in permissions or 'edit_inventory' in permissions:
        allowed |= ASSET_EVENT_TYPES
        allowed |= MARKET_EVENT_TYPES
    if 'view_reports' in permissions:
        allowed |= MARKET_EVENT_TYPES
    if 'view_changelog' in permissions:
        allowed |= ACTIVITY_EVENT_TYPES
    if 'manage_admin' in permissions:
        allowed |= ADMIN_EVENT_TYPES
        allowed |= MARKET_EVENT_TYPES

    return allowed


def baseline_allowed_events(role: str) -> set[str]:
    from accounts.permissions_catalog import DEFAULT_ROLE_PERMISSIONS

    if role == 'full_admin':
        return set(ALL_EVENT_TYPES)
    perms = set(DEFAULT_ROLE_PERMISSIONS.get(role, []))
    return _events_for_permissions(perms, is_full_admin=False)


def baseline_role_defaults(role: str) -> list[dict]:
    """Default enabled/channel matrix for seeding RoleNotificationDefault."""
    allowed = baseline_allowed_events(role)
    rows = []
    for event_type, name, slug, category, desc, enabled, threshold, email, in_app, apprise, refire in NOTIFICATION_DEFAULTS:
        if event_type not in allowed:
            continue
        row_enabled = enabled
        if role != 'full_admin' and event_type in ADMIN_EVENT_TYPES:
            row_enabled = role in ('full_admin', 'site_admin')
        rows.append({
            'role': role,
            'event_type': event_type,
            'enabled': row_enabled,
            'in_app': in_app,
            'email': email,
            'apprise': apprise,
            'threshold': threshold,
            'refire_interval_hours': refire,
        })
    return rows