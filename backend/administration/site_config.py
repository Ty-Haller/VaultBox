"""Public hostname and derived site URLs (AppSetting JSON)."""

from __future__ import annotations

import json
import re
import socket
from urllib.parse import urlparse

from django.conf import settings as django_settings

from .models import AppSetting

SETTING_KEY = 'site_config'

DEFAULT_CONFIG = {
    'hostname': '',
    'useHttps': False,
}

_DEV_HOSTNAMES = frozenset({'localhost', '127.0.0.1', '::1'})
_HOSTNAME_RE = re.compile(
    r'^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$'
)


def _load_json() -> dict:
    row = AppSetting.objects.filter(key=SETTING_KEY).first()
    if not row or not row.value:
        return dict(DEFAULT_CONFIG)
    try:
        data = json.loads(row.value)
        if not isinstance(data, dict):
            return dict(DEFAULT_CONFIG)
        merged = dict(DEFAULT_CONFIG)
        merged.update(data)
        return merged
    except (json.JSONDecodeError, TypeError):
        return dict(DEFAULT_CONFIG)


def _save_json(data: dict) -> dict:
    AppSetting.objects.update_or_create(
        key=SETTING_KEY,
        defaults={
            'value': json.dumps(data),
            'value_type': 'json',
            'category': 'general',
            'description': 'Public hostname (SAN/DNS alias) and derived VaultBox URLs',
        },
    )
    return data


def system_hostname() -> str:
    try:
        fqdn = socket.getfqdn()
        if fqdn and fqdn not in ('localhost', '127.0.0.1'):
            return fqdn.split(':')[0]
    except OSError:
        pass
    try:
        return socket.gethostname().split(':')[0]
    except OSError:
        return 'localhost'


def normalize_hostname(value: str) -> str:
    raw = (value or '').strip()
    if not raw:
        return ''
    if '://' in raw:
        parsed = urlparse(raw)
        raw = parsed.hostname or raw
    return raw.split(':')[0].strip().lower().rstrip('.')


def validate_hostname(hostname: str) -> None:
    if not hostname:
        return
    if hostname in _DEV_HOSTNAMES:
        return
    if len(hostname) > 253:
        raise ValueError('Hostname is too long.')
    if not _HOSTNAME_RE.match(hostname):
        raise ValueError('Invalid hostname. Use a DNS name or SAN (e.g. vaultbox.home.arpa).')


def is_dev_hostname(hostname: str) -> bool:
    if hostname in _DEV_HOSTNAMES:
        return True
    return hostname.endswith('.localhost')


def resolve_hostname(cfg: dict | None = None, request=None) -> str:
    data = cfg if cfg is not None else _load_json()
    configured = normalize_hostname(data.get('hostname', ''))
    if configured:
        return configured
    if request is not None:
        host = (request.META.get('HTTP_HOST') or '').split(':')[0].lower()
        if host:
            return host
    return system_hostname()


def _with_port(scheme: str, hostname: str, port: int | None) -> str:
    if port is None:
        return f'{scheme}://{hostname}'
    if (scheme == 'https' and port == 443) or (scheme == 'http' and port == 80):
        return f'{scheme}://{hostname}'
    return f'{scheme}://{hostname}:{port}'


def get_frontend_base_url(request=None) -> str:
    _ensure_runtime_host_settings()
    cfg = _load_json()
    hostname = resolve_hostname(cfg, request)
    use_https = bool(cfg.get('useHttps'))
    scheme = 'https' if use_https else 'http'

    if is_dev_hostname(hostname):
        host = 'localhost' if hostname == '127.0.0.1' else hostname
        return _with_port(scheme, host, 5173)

    return _with_port(scheme, hostname, 443 if use_https else 80)


def get_backend_base_url(request=None) -> str:
    _ensure_runtime_host_settings()
    cfg = _load_json()
    hostname = resolve_hostname(cfg, request)
    use_https = bool(cfg.get('useHttps'))
    scheme = 'https' if use_https else 'http'

    if is_dev_hostname(hostname):
        return 'http://127.0.0.1:8000'

    return _with_port(scheme, hostname, 443 if use_https else 80)


def get_webauthn_rp_id(request=None) -> str:
    hostname = resolve_hostname(request=request)
    if hostname == '127.0.0.1':
        return 'localhost'
    return hostname


def get_webauthn_origin(request=None) -> str:
    return get_frontend_base_url(request)


_runtime_hosts_applied = False


def _ensure_runtime_host_settings() -> None:
    global _runtime_hosts_applied
    if _runtime_hosts_applied:
        return
    _apply_runtime_host_settings()
    _runtime_hosts_applied = True


def get_site_config(request=None) -> dict:
    _ensure_runtime_host_settings()
    cfg = _load_json()
    hostname = resolve_hostname(cfg, request)
    request_host = (request.META.get('HTTP_HOST') or '').split(':')[0] if request else None
    return {
        'hostname': normalize_hostname(cfg.get('hostname', '')),
        'effectiveHostname': hostname,
        'detectedHostname': system_hostname(),
        'requestHostname': request_host or None,
        'useHttps': bool(cfg.get('useHttps')),
        'frontendBaseUrl': get_frontend_base_url(request),
        'backendBaseUrl': get_backend_base_url(request),
        'webauthnRpId': get_webauthn_rp_id(request),
        'webauthnOrigin': get_webauthn_origin(request),
        'isDevHostname': is_dev_hostname(hostname),
    }


def save_site_config(data: dict) -> dict:
    current = _load_json()
    if 'hostname' in data:
        hostname = normalize_hostname(data['hostname'])
        validate_hostname(hostname)
        current['hostname'] = hostname
    if 'useHttps' in data:
        current['useHttps'] = bool(data['useHttps'])
    _save_json(current)
    global _runtime_hosts_applied
    _runtime_hosts_applied = False
    _ensure_runtime_host_settings()
    return get_site_config()


def get_cors_and_allowed_hosts() -> tuple[list[str], list[str]]:
    cfg = _load_json()
    hostname = resolve_hostname(cfg)
    hosts = {hostname}
    if is_dev_hostname(hostname):
        hosts.update(['localhost', '127.0.0.1'])
    else:
        hosts.add('localhost')
        hosts.add('127.0.0.1')

    origins = {get_frontend_base_url()}
    if is_dev_hostname(hostname):
        origins.add('http://localhost:5173')
        origins.add('http://127.0.0.1:5173')

    return sorted(hosts), sorted(origins)


def _apply_runtime_host_settings() -> None:
    try:
        extra_hosts, extra_origins = get_cors_and_allowed_hosts()
        django_settings.ALLOWED_HOSTS = list(dict.fromkeys([
            *getattr(django_settings, 'ALLOWED_HOSTS', []),
            *extra_hosts,
        ]))
        django_settings.CORS_ALLOWED_ORIGINS = list(dict.fromkeys([
            *getattr(django_settings, 'CORS_ALLOWED_ORIGINS', []),
            *extra_origins,
        ]))
        django_settings.CSRF_TRUSTED_ORIGINS = list(dict.fromkeys([
            *getattr(django_settings, 'CSRF_TRUSTED_ORIGINS', []),
            *extra_origins,
        ]))
    except Exception:
        pass