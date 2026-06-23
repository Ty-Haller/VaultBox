"""System-wide change log helpers."""

from __future__ import annotations

import uuid
from typing import Any

from django.forms.models import model_to_dict

from .models import ChangeLog


SENSITIVE_FIELDS = frozenset({
    'encrypted_seed_phrase',
    'encrypted_content',
    'seedPhrase',
    'content',
})


def _safe_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, uuid.UUID):
        return str(value)
    if hasattr(value, 'isoformat'):
        return value.isoformat()
    if isinstance(value, (list, dict, str, int, float, bool)):
        return value
    return str(value)


def snapshot_instance(instance, fields: list[str] | None = None) -> dict[str, Any]:
    if instance is None:
        return {}
    data = model_to_dict(instance, fields=fields)
    cleaned: dict[str, Any] = {}
    for key, value in data.items():
        if key in SENSITIVE_FIELDS:
            cleaned[key] = '[redacted]'
        else:
            cleaned[key] = _safe_value(value)
    return cleaned


def log_change(
    *,
    entity_type: str,
    entity_id: str,
    entity_label: str,
    action: str,
    performed_by: str = '',
    changes: dict[str, Any] | None = None,
    notes: str = '',
) -> ChangeLog:
    entry = ChangeLog.objects.create(
        entity_type=entity_type,
        entity_id=str(entity_id),
        entity_label=entity_label[:300],
        action=action,
        performed_by=performed_by[:150],
        changes=changes or {},
        notes=notes,
    )
    try:
        from administration.notification_hooks import notify_activity
        notify_activity(entity_type, action, entity_label, str(entity_id), performed_by)
    except Exception:
        pass
    return entry


def log_model_create(instance, entity_type: str, label_field: str = 'name', performed_by: str = '') -> ChangeLog:
    label = getattr(instance, label_field, None) or str(instance.pk)
    return log_change(
        entity_type=entity_type,
        entity_id=instance.pk,
        entity_label=str(label),
        action='create',
        performed_by=performed_by,
        changes={'after': snapshot_instance(instance)},
    )


def log_model_update(
    instance,
    entity_type: str,
    before: dict[str, Any],
    label_field: str = 'name',
    performed_by: str = '',
) -> ChangeLog:
    label = getattr(instance, label_field, None) or str(instance.pk)
    return log_change(
        entity_type=entity_type,
        entity_id=instance.pk,
        entity_label=str(label),
        action='update',
        performed_by=performed_by,
        changes={'before': before, 'after': snapshot_instance(instance)},
    )


def log_model_delete(instance, entity_type: str, label_field: str = 'name', performed_by: str = '') -> ChangeLog:
    label = getattr(instance, label_field, None) or str(instance.pk)
    return log_change(
        entity_type=entity_type,
        entity_id=instance.pk,
        entity_label=str(label),
        action='delete',
        performed_by=performed_by,
        changes={'before': snapshot_instance(instance)},
    )