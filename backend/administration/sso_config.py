"""Admin-configurable OAuth/OIDC SSO providers (AppSetting JSON)."""

from __future__ import annotations

import json
import re
import uuid

from django.conf import settings

from inventory.encryption import decrypt_value, encrypt_value

from .models import AppSetting

SETTING_KEY = 'sso_oauth_providers'

DEFAULT_CONFIG = {
    'providers': [],
}

SECRET_MASK = '********'

def _load_json() -> dict:
    row = AppSetting.objects.filter(key=SETTING_KEY).first()
    if not row or not row.value:
        return dict(DEFAULT_CONFIG)
    try:
        data = json.loads(row.value)
        if not isinstance(data, dict):
            return dict(DEFAULT_CONFIG)
        providers = data.get('providers', [])
        if not isinstance(providers, list):
            providers = []
        return {'providers': providers}
    except (json.JSONDecodeError, TypeError):
        return dict(DEFAULT_CONFIG)


def _save_json(data: dict) -> dict:
    AppSetting.objects.update_or_create(
        key=SETTING_KEY,
        defaults={
            'value': json.dumps(data),
            'value_type': 'json',
            'category': 'security',
            'description': 'OAuth/OIDC SSO provider configuration',
        },
    )
    return data


def _slugify_id(value: str) -> str:
    slug = re.sub(r'[^a-z0-9]+', '-', (value or '').lower()).strip('-')
    return slug or str(uuid.uuid4())


def default_redirect_uri(provider_id: str, request=None) -> str:
    from .site_config import get_backend_base_url
    base = get_backend_base_url(request).rstrip('/')
    return f'{base}/api/auth/oauth/{provider_id}/callback/'


def _provider_to_public(entry: dict) -> dict:
    secret = entry.get('clientSecret') or ''
    has_secret = bool(secret)
    return {
        'id': entry.get('id', ''),
        'name': entry.get('name', ''),
        'enabled': bool(entry.get('enabled', False)),
        'type': entry.get('type', 'generic'),
        'clientId': entry.get('clientId', ''),
        'authorizeUrl': entry.get('authorizeUrl', ''),
        'tokenUrl': entry.get('tokenUrl', ''),
        'userinfoUrl': entry.get('userinfoUrl', ''),
        'scope': entry.get('scope', 'openid email profile'),
        'redirectUri': entry.get('redirectUri', ''),
        'hasClientSecret': has_secret,
    }


def get_sso_config(request=None) -> dict:
    providers = [_provider_to_public(p) for p in _load_json().get('providers', []) if isinstance(p, dict)]
    sample_id = providers[0]['id'] if providers else 'google'
    return {
        'providers': providers,
        'callbackUrlTemplate': default_redirect_uri('{providerId}', request),
        'exampleCallbackUrl': default_redirect_uri(sample_id, request),
    }


def get_sso_config_internal() -> dict:
    return _load_json()


def _normalize_provider(item: dict, existing: dict | None, request=None) -> dict:
    prev = existing or {}
    rid = item.get('id') or prev.get('id') or _slugify_id(item.get('name', ''))
    secret = item.get('clientSecret')
    if secret == SECRET_MASK or secret is None:
        secret = prev.get('clientSecret', '')
    elif secret:
        secret = encrypt_value(secret)
    redirect = (item.get('redirectUri') or prev.get('redirectUri') or '').strip()
    if not redirect:
        redirect = default_redirect_uri(rid, request)
    return {
        'id': rid,
        'name': item.get('name') or prev.get('name') or rid,
        'enabled': bool(item.get('enabled', prev.get('enabled', False))),
        'type': item.get('type') or prev.get('type') or 'generic',
        'clientId': item.get('clientId', prev.get('clientId', '')),
        'clientSecret': secret,
        'authorizeUrl': item.get('authorizeUrl', prev.get('authorizeUrl', '')),
        'tokenUrl': item.get('tokenUrl', prev.get('tokenUrl', '')),
        'userinfoUrl': item.get('userinfoUrl', prev.get('userinfoUrl', '')),
        'scope': item.get('scope', prev.get('scope', 'openid email profile')),
        'redirectUri': redirect,
    }


def save_sso_config(data: dict, request=None) -> dict:
    current = get_sso_config_internal()
    existing_by_id = {
        p.get('id'): p for p in current.get('providers', []) if isinstance(p, dict) and p.get('id')
    }

    if 'providers' in data and isinstance(data['providers'], list):
        merged = []
        for item in data['providers']:
            if not isinstance(item, dict):
                continue
            rid = item.get('id') or _slugify_id(item.get('name', ''))
            merged.append(_normalize_provider(item, existing_by_id.get(rid), request))
        current['providers'] = merged

    _save_json(current)
    return get_sso_config(request)


def get_oauth_provider_map(request=None) -> dict[str, dict]:
    """Map provider id -> oauth_service-compatible config with decrypted secrets."""
    result: dict[str, dict] = {}
    for entry in get_sso_config_internal().get('providers', []):
        if not isinstance(entry, dict):
            continue
        if not entry.get('enabled'):
            continue
        pid = entry.get('id')
        if not pid:
            continue
        client_id = entry.get('clientId', '')
        secret_enc = entry.get('clientSecret', '')
        client_secret = decrypt_value(secret_enc) if secret_enc else ''
        if not client_id or not client_secret:
            continue
        if not entry.get('authorizeUrl') or not entry.get('tokenUrl') or not entry.get('userinfoUrl'):
            continue
        redirect = entry.get('redirectUri') or default_redirect_uri(pid, request)
        result[pid] = {
            'name': entry.get('name', pid),
            'enabled': True,
            'client_id': client_id,
            'client_secret': client_secret,
            'authorize_url': entry['authorizeUrl'],
            'token_url': entry['tokenUrl'],
            'userinfo_url': entry['userinfoUrl'],
            'redirect_uri': redirect,
            'scope': entry.get('scope', 'openid email profile'),
        }
    return result