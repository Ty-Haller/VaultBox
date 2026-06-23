"""Scheduled notification evaluation (audit due, prices, capacity, value)."""

from __future__ import annotations

from django.utils import timezone

from inventory.models import Holding, Vault

from .market_alert_config import get_instrument_alert_config, list_instrument_alert_configs
from .models import AuditWorkflow
from .notification_service import emit, get_system_option


def _days_since(d) -> int | None:
    if not d:
        return None
    return (timezone.now().date() - d).days


def _system_threshold(event_type: str, default: float) -> float:
    opt = get_system_option(event_type)
    if opt and opt.threshold is not None:
        return float(opt.threshold)
    return default


def evaluate_audit_notifications() -> int:
    workflow = AuditWorkflow.objects.filter(applies_to='vault', enabled=True).first()
    if not workflow:
        return 0
    count = 0
    for vault in Vault.objects.all():
        interval = vault.audit_interval_days_override or workflow.interval_days
        reminder = vault.audit_reminder_days_override or workflow.reminder_days_before
        days = _days_since(vault.last_audit_date)
        if days is None:
            emit(
                'audit_overdue',
                title='Audit overdue',
                message=f'{vault.name} has never been audited',
                link=f'/vaults/{vault.id}',
                dedupe_key=f'audit-overdue:{vault.id}',
                severity='critical',
                payload={'vaultId': str(vault.id), 'vaultName': vault.name},
            )
            count += 1
            continue
        days_until_due = interval - days
        if days_until_due < 0:
            emit(
                'audit_overdue',
                title='Audit overdue',
                message=f'{vault.name} last audited {vault.last_audit_date}',
                link=f'/vaults/{vault.id}',
                dedupe_key=f'audit-overdue:{vault.id}',
                severity='critical',
                payload={'vaultId': str(vault.id), 'vaultName': vault.name},
            )
            count += 1
        elif days_until_due <= reminder:
            emit(
                'audit_due',
                title='Audit due soon',
                message=f'{vault.name} audit due in {days_until_due} day(s)',
                link=f'/vaults/{vault.id}/audit',
                dedupe_key=f'audit-due:{vault.id}',
                severity='warning',
                payload={'vaultId': str(vault.id), 'vaultName': vault.name, 'daysUntilDue': days_until_due},
            )
            count += 1
    return count


def evaluate_capacity_notifications() -> int:
    threshold_pct = _system_threshold('capacity_warning', 85.0)
    count = 0
    for vault in Vault.objects.filter(capacity_oz__gt=0):
        vault_threshold = (
            float(vault.capacity_alert_threshold_pct)
            if vault.capacity_alert_threshold_pct is not None
            else threshold_pct
        )
        holdings = Holding.objects.filter(vault=vault, status='active')
        total_oz = sum(float(h.weight_oz or 0) for h in holdings)
        cap = float(vault.capacity_oz or 0)
        if cap <= 0:
            continue
        pct = (total_oz / cap) * 100
        if pct < vault_threshold:
            continue
        emit(
            'capacity_warning',
            title='Vault capacity warning',
            message=f'{vault.name} is at {pct:.0f}% capacity (threshold {vault_threshold:.0f}%)',
            link=f'/vaults/{vault.id}',
            dedupe_key=f'capacity:{vault.id}',
            severity='warning' if pct < 95 else 'critical',
            payload={'vaultId': str(vault.id), 'percent': pct, 'threshold': vault_threshold},
        )
        count += 1
    return count


def evaluate_holding_value_notifications() -> int:
    """Placeholder — full valuation requires live spot prices at evaluation time."""
    return 0


def evaluate_market_price_notifications() -> int:
    """Evaluate per-instrument thresholds when price data is available."""
    configured = list_instrument_alert_configs()
    count = 0
    for item in configured:
        _ = get_instrument_alert_config(item['type'], item['symbol'])
        # Spot comparison wired when live price feed triggers evaluation.
    return count


def evaluate_all() -> dict:
    return {
        'audit': evaluate_audit_notifications(),
        'capacity': evaluate_capacity_notifications(),
        'holding_value': evaluate_holding_value_notifications(),
        'market': evaluate_market_price_notifications(),
    }