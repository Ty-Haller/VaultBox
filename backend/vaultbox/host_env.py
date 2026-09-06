"""Hostname / HTTPS / WebAuthn URL helpers. No Django ORM — safe to import from settings."""

from __future__ import annotations

import json
import os
import re
import sqlite3
from pathlib import Path
from urllib.parse import urlparse

DEV_HOSTNAMES = frozenset({'localhost', '127.0.0.1', '::1'})
_HOSTNAME_RE = re.compile(
    r'^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$'
)


def env_bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name, '').strip().lower()
    if not raw:
        return default
    if raw in {'1', 'true', 'yes', 'on'} :
        return True
    if raw in {'0', 'false', 'no', 'off'}:
        return False
    return default


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
    if hostname in DEV_HOSTNAMES:
        return
    if len(hostname) > 253:
        raise ValueError('Hostname is too long.')
    if not _HOSTNAME_RE.match(hostname):
        raise ValueError('Invalid hostname. Use a DNS name or SAN (e.g. vaultbox.home.arpa).')


def is_dev_hostname(hostname: str) -> bool:
    if hostname in DEV_HOSTNAMES:
        return True
    return hostname.endswith('.localhost')


def env_hostname() -> str:
    host = normalize_hostname(os.environ.get('VAULTBOX_HOSTNAME', ''))
    if host:
        validate_hostname(host)
    return host


def env_use_https() -> bool:
    return env_bool('VAULTBOX_USE_HTTPS', False)


def rp_id_for(hostname: str) -> str:
    host = normalize_hostname(hostname) or 'localhost'
    if host == '127.0.0.1' or host == '::1':
        return 'localhost'
    return host


def _with_port(scheme: str, hostname: str, port: int | None) -> str:
    if port is None:
        return f'{scheme}://{hostname}'
    if (scheme == 'https' and port == 443) or (scheme == 'http' and port == 80):
        return f'{scheme}://{hostname}'
    return f'{scheme}://{hostname}:{port}'


def frontend_base_url(hostname: str, use_https: bool) -> str:
    host = normalize_hostname(hostname) or 'localhost'
    if host == '127.0.0.1':
        host = 'localhost'
    scheme = 'https' if use_https else 'http'
    if is_dev_hostname(host):
        return _with_port(scheme, host, 5173)
    return _with_port(scheme, host, 443 if use_https else 80)


def backend_base_url(hostname: str, use_https: bool) -> str:
    host = normalize_hostname(hostname) or 'localhost'
    if is_dev_hostname(host):
        return 'http://127.0.0.1:8000'
    scheme = 'https' if use_https else 'http'
    return _with_port(scheme, host, 443 if use_https else 80)


def load_admin_override(sqlite_path: Path) -> tuple[str, bool | None]:
    """Read Admin site_config from SQLite without Django ORM (safe at settings import)."""
    if not sqlite_path.is_file():
        return '', None
    try:
        con = sqlite3.connect(f'file:{sqlite_path}?mode=ro', uri=True)
        try:
            row = con.execute(
                'SELECT value FROM administration_appsetting WHERE key = ?',
                ('site_config',),
            ).fetchone()
        finally:
            con.close()
        if not row or not row[0]:
            return '', None
        data = json.loads(row[0])
        if not isinstance(data, dict):
            return '', None
        host = normalize_hostname(str(data.get('hostname', '')))
        https = bool(data.get('useHttps')) if host else None
        return host, https
    except (OSError, sqlite3.Error, json.JSONDecodeError, TypeError, ValueError):
        return '', None


def hosts_and_origins(hostname: str, use_https: bool) -> tuple[list[str], list[str]]:
    host = normalize_hostname(hostname)
    hosts = {'localhost', '127.0.0.1'}
    if host:
        hosts.add(host)
    origins = {
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    }
    if host:
        origins.add(frontend_base_url(host, use_https))
        if use_https and is_dev_hostname(host):
            origins.add(frontend_base_url(host, False))
    return sorted(hosts), sorted(origins)
