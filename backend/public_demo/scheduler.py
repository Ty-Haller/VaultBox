"""Background wipe loop. Only the runserver child / gunicorn worker starts it."""

from __future__ import annotations

import logging
import os
import sys
import threading
import time

from django.utils import timezone

logger = logging.getLogger(__name__)

_started = False
_lock = threading.Lock()


def start_if_needed() -> None:
    global _started
    from .flags import enabled
    if not enabled():
        return
    if 'test' in sys.argv or any('pytest' in a for a in sys.argv):
        return
    # Parent process of `runserver` autoreloader.
    if 'runserver' in sys.argv and os.environ.get('RUN_MAIN') != 'true':
        return
    with _lock:
        if _started:
            return
        _started = True
        thread = threading.Thread(target=_loop, name='vaultbox-demo-reset', daemon=True)
        thread.start()
        logger.info('Public demo reset scheduler started')


def _loop() -> None:
    from .flags import enabled
    from .reset import reset_public_demo
    from .state import ensure_deadline, next_reset_at

    while True:
        try:
            if not enabled():
                time.sleep(5)
                continue
            ensure_deadline()
            nxt = next_reset_at()
            if nxt is not None and timezone.now() >= nxt:
                logger.info('Public demo wipe interval elapsed')
                reset_public_demo()
        except Exception:
            logger.exception('Public demo reset scheduler failed')
        time.sleep(5)
