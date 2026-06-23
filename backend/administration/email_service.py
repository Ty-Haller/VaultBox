"""SMTP email delivery for notifications (admin-configured relay)."""

from __future__ import annotations

import logging
import smtplib
from email.mime.text import MIMEText

from django.contrib.auth.models import User

from .models import AppSetting

logger = logging.getLogger(__name__)

SMTP_KEYS = [
    'smtp_enabled', 'smtp_host', 'smtp_port', 'smtp_tls',
    'smtp_user', 'smtp_password', 'smtp_from_email',
]


def _get_setting(key: str, default: str = '') -> str:
    row = AppSetting.objects.filter(key=key).first()
    return row.value if row else default


def smtp_config() -> dict:
    return {
        'enabled': _get_setting('smtp_enabled', 'false').lower() in ('true', '1', 'yes'),
        'host': _get_setting('smtp_host'),
        'port': int(_get_setting('smtp_port', '587') or '587'),
        'tls': _get_setting('smtp_tls', 'true').lower() in ('true', '1', 'yes'),
        'user': _get_setting('smtp_user'),
        'password': _get_setting('smtp_password'),
        'from_email': _get_setting('smtp_from_email', 'vaultbox@localhost'),
    }


def save_smtp_config(data: dict) -> dict:
    mapping = {
        'enabled': ('smtp_enabled', 'boolean'),
        'host': ('smtp_host', 'string'),
        'port': ('smtp_port', 'number'),
        'tls': ('smtp_tls', 'boolean'),
        'user': ('smtp_user', 'string'),
        'password': ('smtp_password', 'string'),
        'fromEmail': ('smtp_from_email', 'string'),
    }
    for api_key, (db_key, vtype) in mapping.items():
        if api_key not in data:
            continue
        val = data[api_key]
        if vtype == 'boolean':
            val = 'true' if val else 'false'
        else:
            val = str(val)
        AppSetting.objects.update_or_create(
            key=db_key,
            defaults={
                'value': val,
                'value_type': vtype,
                'category': 'integration',
                'description': f'SMTP notification delivery: {db_key}',
            },
        )
    return smtp_config()


def send_notification_email(user: User, subject: str, body: str) -> bool:
    cfg = smtp_config()
    if not cfg['enabled'] or not cfg['host']:
        return False
    to_addr = user.email
    if not to_addr:
        return False
    msg = MIMEText(body, 'plain', 'utf-8')
    msg['Subject'] = subject
    msg['From'] = cfg['from_email']
    msg['To'] = to_addr
    try:
        if cfg['tls']:
            server = smtplib.SMTP(cfg['host'], cfg['port'], timeout=15)
            server.starttls()
        else:
            server = smtplib.SMTP(cfg['host'], cfg['port'], timeout=15)
        if cfg['user']:
            server.login(cfg['user'], cfg['password'])
        server.sendmail(cfg['from_email'], [to_addr], msg.as_string())
        server.quit()
        return True
    except Exception:
        logger.exception('SMTP send failed for user %s', user.username)
        return False