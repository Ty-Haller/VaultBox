"""Backup schedule and rclone remote configuration (AppSetting JSON)."""

from __future__ import annotations

import json
import uuid

from inventory.encryption import decrypt_value, encrypt_value

from .models import AppSetting

DEFAULT_SCHEDULE = {
    'enabled': False,
    'frequency': 'daily',
    'hourUtc': 3,
    'keepCount': 7,
    'includeMedia': True,
    'uploadToRclone': False,
    'defaultRemoteId': None,
    'encryptionEnabled': False,
    'encryptionSecret': None,
}

DEFAULT_RCLONE = {
    'remotes': [],
}


def _load_json(key: str, default: dict) -> dict:
    row = AppSetting.objects.filter(key=key).first()
    if not row or not row.value:
        return dict(default)
    try:
        data = json.loads(row.value)
        if not isinstance(data, dict):
            return dict(default)
        merged = dict(default)
        merged.update(data)
        return merged
    except (json.JSONDecodeError, TypeError):
        return dict(default)


def _save_json(key: str, data: dict, description: str) -> dict:
    AppSetting.objects.update_or_create(
        key=key,
        defaults={
            'value': json.dumps(data),
            'value_type': 'json',
            'category': 'security',
            'description': description,
        },
    )
    return data


def get_backup_schedule() -> dict:
    data = _load_json('backup_schedule', DEFAULT_SCHEDULE)
    # Never expose wrapped secret to API consumers
    return {k: v for k, v in data.items() if k != 'encryptionSecret'}


def get_backup_schedule_internal() -> dict:
    return _load_json('backup_schedule', DEFAULT_SCHEDULE)


def save_backup_schedule(data: dict, encryption_password: str | None = None) -> dict:
    current = get_backup_schedule_internal()
    for key in (
        'enabled', 'frequency', 'hourUtc', 'keepCount', 'includeMedia',
        'uploadToRclone', 'defaultRemoteId', 'encryptionEnabled',
    ):
        if key in data:
            current[key] = data[key]

    if 'encryptionEnabled' in data and not data['encryptionEnabled']:
        current['encryptionSecret'] = None

    if encryption_password:
        current['encryptionEnabled'] = True
        current['encryptionSecret'] = encrypt_value(encryption_password)
    elif data.get('encryptionEnabled') and not current.get('encryptionSecret'):
        raise ValueError('encryptionPassword is required when enabling schedule encryption.')

    _save_json(
        'backup_schedule',
        current,
        'Automated backup schedule, retention, and optional encryption',
    )
    return get_backup_schedule()


def get_schedule_encryption_password() -> str | None:
    secret = get_backup_schedule_internal().get('encryptionSecret')
    if not secret:
        return None
    pwd = decrypt_value(secret)
    return pwd or None


def get_rclone_config() -> dict:
    data = _load_json('backup_rclone_remotes', DEFAULT_RCLONE)
    remotes = data.get('remotes', [])
    if not isinstance(remotes, list):
        remotes = []
    sanitized = []
    for remote in remotes:
        if not isinstance(remote, dict):
            continue
        entry = dict(remote)
        config = entry.get('config', {})
        if isinstance(config, dict):
            safe_config = {}
            for k, v in config.items():
                if k in ('secret_access_key', 'password', 'token', 'client_secret', 'sas_url'):
                    safe_config[k] = '********' if v else ''
                else:
                    safe_config[k] = v
            entry['config'] = safe_config
        sanitized.append(entry)
    return {'remotes': sanitized}


def get_rclone_config_internal() -> dict:
    return _load_json('backup_rclone_remotes', DEFAULT_RCLONE)


def get_rclone_remote(remote_id: str) -> dict | None:
    for remote in get_rclone_config_internal().get('remotes', []):
        if remote.get('id') == remote_id:
            return remote
    return None


def save_rclone_config(data: dict) -> dict:
    current = get_rclone_config_internal()
    if 'remotes' in data and isinstance(data['remotes'], list):
        merged_remotes = []
        existing_by_id = {r.get('id'): r for r in current.get('remotes', []) if r.get('id')}
        for item in data['remotes']:
            if not isinstance(item, dict):
                continue
            rid = item.get('id') or str(uuid.uuid4())
            prev = existing_by_id.get(rid, {})
            config = dict(prev.get('config', {}))
            incoming = item.get('config', {})
            if isinstance(incoming, dict):
                for k, v in incoming.items():
                    if v == '********' and k in config:
                        continue
                    config[k] = v
            merged_remotes.append({
                'id': rid,
                'name': item.get('name') or prev.get('name') or rid,
                'type': item.get('type') or prev.get('type') or 'local',
                'config': config,
                'destinationPath': item.get('destinationPath', prev.get('destinationPath', '')),
            })
        current['remotes'] = merged_remotes
    _save_json(
        'backup_rclone_remotes',
        current,
        'rclone remotes for off-site backup upload',
    )
    return get_rclone_config()