"""Public hostname and derived site URLs (env boot defaults + optional Admin override)."""

from __future__ import annotations

import json
import socket

from django.conf import settings as django_settings
from django.db.utils import OperationalError, ProgrammingError

from vaultbox.host_env import (
    backend_base_url,
    env_hostname,
    env_use_https,
    frontend_base_url,
    hosts_and_origins,
    is_dev_hostname,
    normalize_hostname,
    rp_id_for,
    validate_hostname,
)

from .models import AppSetting

SETTING_KEY = 'site_config'

DEFAULT_CONFIG = {
    'hostname': '',
    'useHttps': False,
}

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


def _load_json() -> dict:
    try:
        row = AppSetting.objects.filter(key=SETTING_KEY).first()
    except (OperationalError, ProgrammingError):
        return dict(DEFAULT_CONFIG)
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


def _admin_hostname(cfg: dict) -> str:
    return normalize_hostname(cfg.get('hostname', ''))


def _boot_hostname() -> str:
    return getattr(django_settings, 'VAULTBOX_HOSTNAME', None) or env_hostname()


def _boot_use_https() -> bool:
    return bool(getattr(django_settings, 'VAULTBOX_USE_HTTPS', env_use_https()))


def resolve_hostname(cfg: dict | None = None, request=None) -> tuple[str, str]:
    data = cfg if cfg is not None else _load_json()
    admin_host = _admin_hostname(data)
    if admin_host:
        return admin_host, 'admin'
    env_host = _boot_hostname()
    if env_host:
        return env_host, 'env'
    if request is not None:
        host = (request.META.get('HTTP_HOST') or '').split(':')[0].lower()
        if host:
            if host in ('127.0.0.1', '::1'):
                host = 'localhost'
            return host, 'request'
    return system_hostname(), 'system'


def resolve_use_https(cfg: dict | None = None) -> tuple[bool, str]:
    data = cfg if cfg is not None else _load_json()
    if _admin_hostname(data):
        return bool(data.get('useHttps')), 'admin'
    if os_environ_set('VAULTBOX_USE_HTTPS') or _boot_hostname():
        return _boot_use_https(), 'env'
    return False, 'default'


def os_environ_set(name: str) -> bool:
    import os
    return bool(os.environ.get(name, '').strip())


def get_frontend_base_url(request=None) -> str:
    apply_host_settings()
    cfg = _load_json()
    hostname, _ = resolve_hostname(cfg, request)
    use_https, _ = resolve_use_https(cfg)
    return frontend_base_url(hostname, use_https)


def get_backend_base_url(request=None) -> str:
    apply_host_settings()
    cfg = _load_json()
    hostname, _ = resolve_hostname(cfg, request)
    use_https, _ = resolve_use_https(cfg)
    return backend_base_url(hostname, use_https)


def get_webauthn_rp_id(request=None) -> str:
    hostname, _ = resolve_hostname(request=request)
    return rp_id_for(hostname)


def get_webauthn_origin(request=None) -> str:
    return get_frontend_base_url(request)


def get_site_config(request=None) -> dict:
    apply_host_settings()
    cfg = _load_json()
    hostname, hostname_source = resolve_hostname(cfg, request)
    use_https, use_https_source = resolve_use_https(cfg)
    request_host = (request.META.get('HTTP_HOST') or '').split(':')[0] if request else None
    env_host = _boot_hostname()
    return {
        'hostname': _admin_hostname(cfg),
        'effectiveHostname': hostname,
        'detectedHostname': system_hostname(),
        'requestHostname': request_host or None,
        'envHostname': env_host,
        'envUseHttps': _boot_use_https(),
        'hostnameSource': hostname_source,
        'useHttpsSource': use_https_source,
        'useHttps': use_https,
        'frontendBaseUrl': frontend_base_url(hostname, use_https),
        'backendBaseUrl': backend_base_url(hostname, use_https),
        'webauthnRpId': rp_id_for(hostname),
        'webauthnOrigin': frontend_base_url(hostname, use_https),
        'isDevHostname': is_dev_hostname(hostname),
    }


def save_site_config(data: dict, request=None) -> dict:
    current = _load_json()
    if 'hostname' in data:
        hostname = normalize_hostname(data['hostname'])
        validate_hostname(hostname)
        current['hostname'] = hostname
    if 'useHttps' in data:
        current['useHttps'] = bool(data['useHttps'])
    _save_json(current)
    apply_host_settings(force=True)
    return get_site_config(request)


def get_cors_and_allowed_hosts(request=None) -> tuple[list[str], list[str]]:
    cfg = _load_json()
    hostname, _ = resolve_hostname(cfg, request)
    use_https, _ = resolve_use_https(cfg)
    return hosts_and_origins(hostname, use_https)


def apply_host_settings(force: bool = False) -> None:
    global _runtime_hosts_applied
    if _runtime_hosts_applied and not force:
        return
    try:
        extra_hosts, extra_origins = get_cors_and_allowed_hosts()
    except (OperationalError, ProgrammingError):
        extra_hosts, extra_origins = hosts_and_origins(_boot_hostname(), _boot_use_https())
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
    _runtime_hosts_applied = True


_runtime_hosts_applied = False


# Back-compat for the old one-shot name
def _ensure_runtime_host_settings() -> None:
    apply_host_settings()
