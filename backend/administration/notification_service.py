"""Notification engine: resolve preferences, emit, dedupe/refire."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal
from typing import Any
from urllib.parse import urlparse

from django.contrib.auth.models import User
from django.db.models import Q
from django.utils import timezone

from accounts.access import get_user_access

from .email_service import send_notification_email
from .models import (
    Notification,
    NotificationOption,
    RoleNotificationDefault,
    UserNotificationPreference,
    UserProfile,
)
from .role_notification_baseline import ALL_EVENT_TYPES, baseline_allowed_events

logger = logging.getLogger(__name__)

_CLOUD_METADATA_HOSTS = frozenset({
    '169.254.169.254',
    'metadata.google.internal',
    'metadata.google.com',
    'fd00:ec2::254',
})


@dataclass
class EffectiveNotificationConfig:
    allowed: bool
    enabled: bool
    in_app: bool
    email: bool
    apprise: bool
    threshold: float | None
    refire_interval_hours: int | None


def _coalesce(*values, default=None):
    for v in values:
        if v is not None:
            return v
    return default


def get_system_option(event_type: str) -> NotificationOption | None:
    return NotificationOption.objects.filter(event_type=event_type).first()


def user_allowed_event_types(user: User) -> set[str]:
    access = get_user_access(user)
    if access.is_full_admin:
        return set(ALL_EVENT_TYPES)
    allowed: set[str] = set()
    if access.global_role:
        allowed |= baseline_allowed_events(access.global_role)
    for r in access.site_roles.values():
        allowed |= baseline_allowed_events(r)
    for r in access.vault_roles.values():
        allowed |= baseline_allowed_events(r)
    from .role_notification_baseline import _events_for_permissions
    allowed |= _events_for_permissions(access.permissions, False)
    return allowed


def resolve_config(user: User, event_type: str) -> EffectiveNotificationConfig:
    allowed_types = user_allowed_event_types(user)
    if event_type not in allowed_types:
        return EffectiveNotificationConfig(False, False, False, False, False, None, None)

    system = get_system_option(event_type)
    if not system:
        return EffectiveNotificationConfig(True, False, False, False, False, None, None)

    role = get_user_access(user).global_role or 'viewer'
    role_def = RoleNotificationDefault.objects.filter(role=role, event_type=event_type).first()
    user_pref = UserNotificationPreference.objects.filter(user=user, event_type=event_type).first()

    enabled = _coalesce(
        user_pref.enabled if user_pref else None,
        role_def.enabled if role_def else None,
        system.enabled,
        default=False,
    )
    in_app = _coalesce(
        user_pref.in_app if user_pref else None,
        role_def.in_app if role_def else None,
        system.in_app_notify,
        default=True,
    )
    email = _coalesce(
        user_pref.email if user_pref else None,
        role_def.email if role_def else None,
        system.email_notify,
        default=False,
    )
    apprise = _coalesce(
        user_pref.apprise if user_pref else None,
        role_def.apprise if role_def else None,
        system.apprise_notify,
        default=False,
    )
    threshold = _coalesce(
        float(user_pref.threshold) if user_pref and user_pref.threshold is not None else None,
        float(role_def.threshold) if role_def and role_def.threshold is not None else None,
        float(system.threshold) if system.threshold is not None else None,
        default=None,
    )
    refire = _coalesce(
        user_pref.refire_interval_hours if user_pref else None,
        role_def.refire_interval_hours if role_def else None,
        system.refire_interval_hours,
        default=None,
    )
    return EffectiveNotificationConfig(True, enabled, in_app, email, apprise, threshold, refire)


def resolve_recipients(event_type: str, users: list[User] | None = None) -> list[User]:
    if users is not None:
        candidates = users
    else:
        candidates = list(User.objects.filter(is_active=True))
    result = []
    for user in candidates:
        cfg = resolve_config(user, event_type)
        if cfg.allowed and cfg.enabled:
            result.append(user)
    return result


def _should_refire(existing: Notification | None, refire_hours: int | None) -> bool:
    if existing is None:
        return True
    if not refire_hours:
        return False
    cutoff = timezone.now() - timedelta(hours=refire_hours)
    return existing.updated_at <= cutoff


def emit(
    event_type: str,
    *,
    title: str,
    message: str,
    link: str = '',
    dedupe_key: str = '',
    severity: str = 'info',
    payload: dict | None = None,
    users: list[User] | None = None,
) -> int:
    """Create/deliver notifications. Returns count of in-app notifications created/updated."""
    payload = payload or {}
    from public_demo.flags import enabled as public_demo_enabled
    skip_egress = public_demo_enabled()
    recipients = resolve_recipients(event_type, users)
    count = 0
    for user in recipients:
        cfg = resolve_config(user, event_type)
        if not cfg.in_app and not cfg.email and not cfg.apprise:
            continue

        notif = None
        if dedupe_key and cfg.in_app:
            existing = Notification.objects.filter(
                user=user, dedupe_key=dedupe_key, dismissed_at__isnull=True,
            ).order_by('-created_at').first()
            if existing and not cfg.refire_interval_hours:
                continue
            if not _should_refire(existing, cfg.refire_interval_hours):
                continue
            if existing and cfg.refire_interval_hours:
                existing.title = title
                existing.message = message
                existing.link = link
                existing.payload = payload
                existing.severity = severity
                existing.read_at = None
                existing.save(update_fields=[
                    'title', 'message', 'link', 'payload', 'severity', 'read_at', 'updated_at',
                ])
                notif = existing
                count += 1
            elif not existing:
                notif = Notification.objects.create(
                    user=user,
                    event_type=event_type,
                    severity=severity,
                    title=title,
                    message=message,
                    link=link,
                    payload=payload,
                    dedupe_key=dedupe_key,
                )
                count += 1
        elif cfg.in_app:
            notif = Notification.objects.create(
                user=user,
                event_type=event_type,
                severity=severity,
                title=title,
                message=message,
                link=link,
                payload=payload,
                dedupe_key=dedupe_key,
            )
            count += 1

        if cfg.email and user.email and not skip_egress:
            if send_notification_email(user, title, f'{message}\n\n{link}'.strip()):
                if notif:
                    notif.emailed_at = timezone.now()
                    notif.save(update_fields=['emailed_at'])

        if cfg.apprise and not skip_egress:
            profile, _ = UserProfile.objects.get_or_create(user=user)
            urls = profile.apprise_urls or []
            _send_apprise(urls, title, message, link, event_type, user.username, payload)

    return count


def _mask_apprise_url(url: str) -> str:
    raw = (url or '').strip()
    if not raw:
        return ''
    if '://' not in raw:
        return raw[:24] + ('…' if len(raw) > 24 else '')
    scheme, rest = raw.split('://', 1)
    if '@' in rest:
        creds, target = rest.split('@', 1)
        cred_hint = creds[:3] + '…' if len(creds) > 3 else creds
        if len(target) > 36:
            target = f'{target[:16]}…{target[-8:]}'
        return f'{scheme}://{cred_hint}@{target}'
    if len(rest) > 36:
        return f'{scheme}://{rest[:16]}…{rest[-8:]}'
    return raw


def _is_cloud_metadata_url(url: str) -> bool:
    parsed = urlparse(url)
    host = (parsed.hostname or '').lower().rstrip('.')
    if host.startswith('[') and host.endswith(']'):
        host = host[1:-1]
    if not host and '://' in url:
        rest = url.split('://', 1)[1]
        host = (urlparse(f'http://{rest}').hostname or '').lower().rstrip('.')
        if host.startswith('[') and host.endswith(']'):
            host = host[1:-1]
    return host in _CLOUD_METADATA_HOSTS or host.endswith('.169.254.169.254')


def _deliver_apprise_url(url: str, title: str, body: str) -> tuple[bool, str | None]:
    cleaned = (url or '').strip()
    if not cleaned:
        return False, 'Empty URL'
    if _is_cloud_metadata_url(cleaned):
        return False, 'This URL is not allowed.'
    try:
        import apprise
    except ImportError:
        apprise = None
    try:
        if apprise is not None:
            app = apprise.Apprise()
            if not app.add(cleaned):
                return False, 'Apprise rejected this URL — check the format.'
            if app.notify(title=title, body=body):
                return True, None
            return False, 'Notification was not accepted by the service.'
        if cleaned.startswith(('http://', 'https://')):
            import requests
            res = requests.post(cleaned, json={
                'title': title,
                'body': body,
                'type': 'info',
            }, timeout=12)
            if res.ok:
                return True, None
            return False, f'HTTP {res.status_code}'
        return False, 'Apprise library not installed — only https:// URLs can be tested.'
    except Exception:
        logger.exception('Apprise delivery failed')
        return False, 'Delivery failed'


def _channel_result(*, skipped: bool = False, ok: bool = False, error: str | None = None, detail: str | None = None) -> dict:
    return {
        'skipped': skipped,
        'ok': ok,
        'error': error,
        'detail': detail,
    }


def test_user_notifications(
    user: User,
    *,
    channels: list[str] | None = None,
    apprise_urls: list | None = None,
) -> dict:
    """Send a test notification through selected delivery channels."""
    selected = {c for c in (channels or ['inApp', 'email', 'apprise'])}
    title = 'VaultBox Test Notification'
    message = f'This is a test notification for {user.username}.'
    link = '/settings'

    out: dict[str, Any] = {
        'inApp': _channel_result(skipped='inApp' not in selected),
        'email': _channel_result(skipped='email' not in selected),
        'apprise': _channel_result(skipped='apprise' not in selected),
    }

    if 'inApp' in selected:
        try:
            Notification.objects.create(
                user=user,
                event_type='activity_update',
                severity='info',
                title=title,
                message=message,
                link=link,
                payload={'test': True},
                dedupe_key=f'test:{user.pk}:{timezone.now().timestamp()}',
            )
            out['inApp'] = _channel_result(ok=True, detail='Added to your notification inbox.')
        except Exception:
            logger.exception('In-app test notification failed')
            out['inApp'] = _channel_result(error='Failed to create in-app notification.')

    if 'email' in selected:
        if not user.email:
            out['email'] = _channel_result(error='No email address on your account.')
        elif send_notification_email(user, title, f'{message}\n\n{link}'.strip()):
            out['email'] = _channel_result(ok=True, detail=f'Sent to {user.email}.')
        else:
            out['email'] = _channel_result(error='SMTP is not configured or the send failed.')

    if 'apprise' in selected:
        profile, _ = UserProfile.objects.get_or_create(user=user)
        urls = apprise_urls if apprise_urls is not None else (profile.apprise_urls or [])
        cleaned = [u.strip() for u in urls if u and str(u).strip()]
        if not cleaned:
            out['apprise'] = _channel_result(error='No Apprise URLs configured.')
        else:
            body = message
            endpoint_results = []
            for url in cleaned:
                ok, err = _deliver_apprise_url(url, title, body)
                endpoint_results.append({
                    'url': _mask_apprise_url(url),
                    'ok': ok,
                    'error': err,
                })
            all_ok = all(r['ok'] for r in endpoint_results)
            failed = [r for r in endpoint_results if not r['ok']]
            out['apprise'] = {
                'skipped': False,
                'ok': all_ok,
                'error': None if all_ok else f'{len(failed)} of {len(endpoint_results)} endpoint(s) failed.',
                'detail': (
                    f'All {len(endpoint_results)} endpoint(s) accepted the test.'
                    if all_ok
                    else None
                ),
                'results': endpoint_results,
            }

    attempted = [k for k, v in out.items() if not v.get('skipped')]
    out['sent'] = bool(attempted) and all(out[ch]['ok'] for ch in attempted if not out[ch].get('skipped'))
    return out


def test_apprise_urls(urls: list, username: str) -> dict:
    title = 'VaultBox Test Notification'
    body = f'This is a test notification from VaultBox for {username}.'
    results = []
    for url in urls:
        cleaned = (url or '').strip()
        if not cleaned:
            continue
        ok, err = _deliver_apprise_url(cleaned, title, body)
        results.append({
            'url': _mask_apprise_url(cleaned),
            'ok': ok,
            'error': err,
        })
    if not results:
        return {'sent': False, 'error': 'No Apprise URLs to test.', 'results': []}
    return {
        'sent': all(r['ok'] for r in results),
        'results': results,
    }


def _send_apprise(urls: list, title: str, message: str, link: str, event_type: str, username: str, payload: dict) -> None:
    if not urls:
        return
    body = message
    if link:
        body = f'{message}\n{link}'
    for url in urls:
        if not url:
            continue
        _deliver_apprise_url(url.strip(), title, body)


def dismiss_notification(user: User, notification_id: str) -> bool:
    updated = Notification.objects.filter(
        user=user, pk=notification_id, dismissed_at__isnull=True,
    ).update(dismissed_at=timezone.now())
    return updated > 0


def clear_notifications(user: User) -> int:
    return Notification.objects.filter(user=user, dismissed_at__isnull=True).update(
        dismissed_at=timezone.now()
    )


def reset_notification_catalog() -> int:
    from .notification_catalog import NOTIFICATION_DEFAULTS

    NotificationOption.objects.all().delete()
    created = 0
    for row in NOTIFICATION_DEFAULTS:
        event_type, name, slug, category, desc, enabled, threshold, email, in_app, apprise, refire = row
        NotificationOption.objects.create(
            name=name, slug=slug, event_type=event_type, category=category,
            description=desc, enabled=enabled, threshold=threshold,
            email_notify=email, in_app_notify=in_app, apprise_notify=apprise,
            refire_interval_hours=refire, is_system_default=True,
        )
        created += 1
    return created


def seed_role_notification_defaults() -> int:
    from .role_notification_baseline import VAULTBOX_ROLES, baseline_role_defaults

    RoleNotificationDefault.objects.all().delete()
    count = 0
    for role in VAULTBOX_ROLES:
        for row in baseline_role_defaults(role):
            RoleNotificationDefault.objects.create(**row)
            count += 1
    return count