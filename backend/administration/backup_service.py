"""Create, list, restore, and upload VaultBox backups."""

from __future__ import annotations

import json
import logging
import os
import shutil
import sqlite3
import subprocess
import tarfile
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from django.conf import settings
from django.db import connection

from .backup_config import (
    get_backup_schedule_internal,
    get_rclone_config_internal,
    get_rclone_remote,
    get_schedule_encryption_password,
)
from .backup_crypto import MAGIC, BackupCryptoError, decrypt_file, encrypt_file
from .models import BackupRecord

logger = logging.getLogger(__name__)

BACKUP_VERSION = 1


def backup_root() -> Path:
    root = Path(getattr(settings, 'BACKUP_ROOT', settings.BASE_DIR / 'backups'))
    root.mkdir(parents=True, exist_ok=True)
    return root


def _db_path() -> Path:
    return Path(settings.DATABASES['default']['NAME'])


def _media_path() -> Path:
    return Path(settings.MEDIA_ROOT)


def _timestamp_slug() -> str:
    return datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')


def _sqlite_backup(dest_path: Path) -> None:
    src = str(_db_path())
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(src) as src_conn, sqlite3.connect(str(dest_path)) as dest_conn:
        src_conn.backup(dest_conn)


def _build_tarball(work_dir: Path, include_media: bool) -> Path:
    manifest = {
        'version': BACKUP_VERSION,
        'createdAt': datetime.now(timezone.utc).isoformat(),
        'includeMedia': include_media,
        'encrypted': False,
    }
    manifest_path = work_dir / 'manifest.json'
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding='utf-8')

    archive_path = work_dir / 'archive.tar.gz'
    with tarfile.open(archive_path, 'w:gz') as tar:
        tar.add(manifest_path, arcname='manifest.json')
        db_file = work_dir / 'db.sqlite3'
        if db_file.exists():
            tar.add(db_file, arcname='db.sqlite3')
        if include_media:
            media_src = work_dir / 'media'
            if media_src.exists():
                tar.add(media_src, arcname='media')
    return archive_path


def create_backup(
    *,
    trigger: str = 'manual',
    include_media: bool = True,
    encrypt: bool = False,
    password: str | None = None,
    upload_rclone: bool = False,
    remote_id: str | None = None,
) -> BackupRecord:
    if encrypt and not password:
        raise ValueError('Password is required for encrypted backups.')

    slug = _timestamp_slug()
    record = BackupRecord.objects.create(
        filename='',
        size_bytes=0,
        trigger=trigger,
        status='running',
        include_media=include_media,
        encrypted=encrypt,
    )

    try:
        with tempfile.TemporaryDirectory(prefix='vaultbox-backup-') as tmp:
            work = Path(tmp)
            _sqlite_backup(work / 'db.sqlite3')
            if include_media and _media_path().exists():
                shutil.copytree(_media_path(), work / 'media', dirs_exist_ok=True)
            tarball = _build_tarball(work, include_media)

            if encrypt:
                final_name = f'vaultbox-backup-{slug}.vaultbox'
                final_path = backup_root() / final_name
                encrypt_file(str(tarball), str(final_path), password)
            else:
                final_name = f'vaultbox-backup-{slug}.tar.gz'
                final_path = backup_root() / final_name
                shutil.copy2(tarball, final_path)

            record.filename = final_name
            record.size_bytes = final_path.stat().st_size
            record.status = 'completed'

            schedule = get_backup_schedule_internal()
            rid = remote_id or schedule.get('defaultRemoteId')
            should_upload = upload_rclone or (
                trigger == 'scheduled' and schedule.get('uploadToRclone')
            )
            if should_upload and rid:
                record.rclone_remote_id = rid
                ok, err = push_to_rclone(record, rid)
                record.rclone_uploaded = ok
                if not ok:
                    record.error = err or 'rclone upload failed'
            record.save()
            apply_retention(schedule.get('keepCount', 7))
            return record
    except Exception as exc:
        logger.exception('Backup failed')
        record.status = 'failed'
        record.error = str(exc)
        record.save()
        raise


def apply_retention(keep_count: int | None) -> int:
    if not keep_count or keep_count < 1:
        return 0
    records = list(
        BackupRecord.objects.filter(status='completed')
        .order_by('-created_at')
    )
    deleted = 0
    for record in records[keep_count:]:
        delete_backup(record.id)
        deleted += 1
    return deleted


def delete_backup(backup_id) -> bool:
    record = BackupRecord.objects.filter(pk=backup_id).first()
    if not record:
        return False
    path = backup_root() / record.filename
    if path.exists():
        path.unlink()
    record.delete()
    return True


def get_backup_file_path(backup_id) -> Path | None:
    record = BackupRecord.objects.filter(pk=backup_id, status='completed').first()
    if not record or not record.filename:
        return None
    path = backup_root() / record.filename
    return path if path.exists() else None


def _is_encrypted_backup(path: Path) -> bool:
    name = path.name.lower()
    if name.endswith('.vaultbox'):
        return True
    if name.endswith('.tar.gz'):
        return False
    with path.open('rb') as handle:
        return handle.read(len(MAGIC)) == MAGIC


def _apply_extracted_backup(extract_dir: Path) -> dict:
    manifest_path = extract_dir / 'manifest.json'
    if not manifest_path.exists():
        raise ValueError('Invalid backup: manifest.json missing.')
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))

    db_src = extract_dir / 'db.sqlite3'
    if not db_src.exists():
        raise ValueError('Invalid backup: db.sqlite3 missing.')

    connection.close()
    shutil.copy2(db_src, _db_path())

    if manifest.get('includeMedia'):
        media_src = extract_dir / 'media'
        media_dest = _media_path()
        if media_dest.exists():
            shutil.rmtree(media_dest)
        if media_src.exists():
            shutil.copytree(media_src, media_dest)
        else:
            media_dest.mkdir(parents=True, exist_ok=True)

    return manifest


def _restore_from_file_path(path: Path, *, password: str | None = None, encrypted: bool | None = None) -> dict:
    if not path.exists():
        raise ValueError('Backup file missing.')

    is_encrypted = _is_encrypted_backup(path) if encrypted is None else encrypted
    create_backup(trigger='pre_restore', include_media=True, encrypt=False)

    with tempfile.TemporaryDirectory(prefix='vaultbox-restore-') as tmp:
        work = Path(tmp)
        archive = work / 'archive.tar.gz'

        if is_encrypted:
            if not password:
                raise ValueError('Password is required to restore an encrypted backup.')
            try:
                decrypt_file(str(path), str(archive), password)
            except BackupCryptoError as exc:
                raise ValueError(str(exc)) from exc
        else:
            shutil.copy2(path, archive)

        extract_dir = work / 'extract'
        extract_dir.mkdir()
        with tarfile.open(archive, 'r:gz') as tar:
            tar.extractall(extract_dir, filter='data')

        return _apply_extracted_backup(extract_dir)


def restore_backup(backup_id, password: str | None = None) -> BackupRecord:
    record = BackupRecord.objects.filter(pk=backup_id, status='completed').first()
    if not record:
        raise ValueError('Backup not found or not completed.')

    path = backup_root() / record.filename
    _restore_from_file_path(
        path,
        password=password,
        encrypted=record.encrypted,
    )
    return record


def restore_uploaded_backup(uploaded_file, password: str | None = None) -> dict:
    name = (getattr(uploaded_file, 'name', '') or '').lower()
    if not (name.endswith('.tar.gz') or name.endswith('.vaultbox')):
        raise ValueError('Upload a .tar.gz or .vaultbox VaultBox backup file.')

    max_bytes = int(getattr(settings, 'BACKUP_UPLOAD_MAX_BYTES', 2 * 1024 ** 3))
    size = getattr(uploaded_file, 'size', None)
    if size is not None and size > max_bytes:
        raise ValueError(f'Backup file exceeds maximum upload size ({max_bytes // (1024 ** 2)} MB).')

    suffix = '.vaultbox' if name.endswith('.vaultbox') else '.tar.gz'
    tmp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            total = 0
            for chunk in uploaded_file.chunks():
                total += len(chunk)
                if total > max_bytes:
                    raise ValueError(f'Backup file exceeds maximum upload size ({max_bytes // (1024 ** 2)} MB).')
                tmp.write(chunk)
            tmp_path = Path(tmp.name)
        return _restore_from_file_path(tmp_path, password=password)
    finally:
        if tmp_path is not None:
            tmp_path.unlink(missing_ok=True)


def _write_rclone_conf(remotes: list, path: Path) -> None:
    lines: list[str] = []
    for remote in remotes:
        lines.append(f"[{remote['id']}]")
        lines.append(f"type = {remote.get('type', 'local')}")
        config = remote.get('config', {})
        if isinstance(config, dict):
            for key, value in config.items():
                if value is None or value == '':
                    continue
                lines.append(f'{key} = {value}')
        lines.append('')
    path.write_text('\n'.join(lines), encoding='utf-8')


def push_to_rclone(record: BackupRecord, remote_id: str) -> tuple[bool, str | None]:
    remote = get_rclone_remote(remote_id)
    if not remote:
        return False, 'Remote not found.'
    path = backup_root() / record.filename
    if not path.exists():
        return False, 'Backup file missing.'

    dest_path = (remote.get('destinationPath') or '').strip().strip('/')
    remote_target = f"{remote_id}:{dest_path}/{record.filename}" if dest_path else f"{remote_id}:{record.filename}"

    with tempfile.TemporaryDirectory() as tmp:
        conf = Path(tmp) / 'rclone.conf'
        _write_rclone_conf(get_rclone_config_internal().get('remotes', []), conf)
        try:
            result = subprocess.run(
                [
                    'rclone', 'copyto',
                    '--config', str(conf),
                    str(path),
                    remote_target,
                ],
                capture_output=True,
                text=True,
                timeout=600,
                check=False,
            )
            if result.returncode != 0:
                err = (result.stderr or result.stdout or 'rclone failed').strip()
                return False, err[:500]
            return True, None
        except FileNotFoundError:
            return False, 'rclone binary not found on server PATH.'
        except subprocess.TimeoutExpired:
            return False, 'rclone upload timed out.'
        except Exception as exc:
            return False, str(exc)


def test_rclone_remote(remote_id: str) -> tuple[bool, str | None]:
    remote = get_rclone_remote(remote_id)
    if not remote:
        return False, 'Remote not found.'
    dest_path = (remote.get('destinationPath') or '').strip().strip('/')
    target = f"{remote_id}:{dest_path}" if dest_path else f"{remote_id}:"

    with tempfile.TemporaryDirectory() as tmp:
        conf = Path(tmp) / 'rclone.conf'
        _write_rclone_conf(get_rclone_config_internal().get('remotes', []), conf)
        try:
            result = subprocess.run(
                ['rclone', 'lsd', '--config', str(conf), target],
                capture_output=True,
                text=True,
                timeout=60,
                check=False,
            )
            if result.returncode != 0:
                err = (result.stderr or result.stdout or 'Connection failed').strip()
                return False, err[:500]
            return True, None
        except FileNotFoundError:
            return False, 'rclone binary not found on server PATH.'
        except Exception as exc:
            return False, str(exc)


def run_scheduled_backup() -> BackupRecord | None:
    schedule = get_backup_schedule_internal()
    if not schedule.get('enabled'):
        return None

    password = None
    encrypt = bool(schedule.get('encryptionEnabled'))
    if encrypt:
        password = get_schedule_encryption_password()
        if not password:
            raise ValueError('Schedule encryption enabled but password unavailable.')

    return create_backup(
        trigger='scheduled',
        include_media=bool(schedule.get('includeMedia', True)),
        encrypt=encrypt,
        password=password,
        upload_rclone=bool(schedule.get('uploadToRclone')),
        remote_id=schedule.get('defaultRemoteId'),
    )