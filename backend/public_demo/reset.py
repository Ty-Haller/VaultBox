"""Wipe and reseed the public demo database. Does not touch a non-demo DATA_DIR by policy
of the local launcher; this function operates on whatever Django is configured to use.
"""

from __future__ import annotations

import fcntl
import logging
import shutil
from pathlib import Path

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.sessions.models import Session
from django.core.management import call_command
from django.db import transaction

logger = logging.getLogger(__name__)


def reset_public_demo() -> None:
    lock_path = Path(settings.DATA_DIR) / '.demo-reset.lock'
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    with lock_path.open('a+') as lockf:
        fcntl.flock(lockf.fileno(), fcntl.LOCK_EX)
        _reset_locked()


def _reset_locked() -> None:
    from .state import bump_deadline
    # Advance the deadline first so clients see a new cycle immediately.
    bump_deadline()

    media = Path(settings.MEDIA_ROOT)
    if media.is_dir():
        for child in media.iterdir():
            if child.is_dir():
                shutil.rmtree(child, ignore_errors=True)
            else:
                child.unlink(missing_ok=True)

    with transaction.atomic():
        Session.objects.all().delete()
        User.objects.exclude(username='admin').delete()

    call_command('seed_roles')
    call_command('reset_bootstrap')
    call_command('seed_notifications')
    call_command('seed_data', flush=True)
    logger.info('Public demo reset complete')
