"""Emit notifications from domain events."""

from __future__ import annotations

from django.contrib.auth.models import User

from .notification_service import emit


def notify_audit_completed(vault_name: str, vault_id: str, discrepancy_count: int) -> None:
    if discrepancy_count > 0:
        emit(
            'audit_completed_issues',
            title='Audit completed with issues',
            message=f'{vault_name}: {discrepancy_count} discrepanc{"y" if discrepancy_count == 1 else "ies"} found',
            link=f'/vaults/{vault_id}',
            severity='warning',
            payload={'vaultId': vault_id, 'discrepancyCount': discrepancy_count},
        )
    else:
        emit(
            'audit_completed',
            title='Audit completed',
            message=f'{vault_name} audit completed with no discrepancies',
            link=f'/vaults/{vault_id}',
            severity='info',
            payload={'vaultId': vault_id},
        )


def notify_audit_canceled(vault_name: str, vault_id: str, performed_by: str = '') -> None:
    emit(
        'audit_canceled',
        title='Audit canceled',
        message=f'{vault_name} audit was canceled' + (f' by {performed_by}' if performed_by else ''),
        link=f'/audits',
        severity='info',
        payload={'vaultId': vault_id},
    )


def notify_signup_request(username: str, request_id: str) -> None:
    emit(
        'signup_request',
        title='New signup request',
        message=f'{username} requested VaultBox access',
        link='/admin/signup-requests',
        severity='info',
        payload={'requestId': request_id, 'username': username},
    )


def notify_user_created(username: str, user_id: int) -> None:
    emit(
        'user_created',
        title='User created',
        message=f'Account {username} was created',
        link=f'/admin/users',
        severity='info',
        payload={'userId': user_id, 'username': username},
    )


def notify_user_deleted(username: str) -> None:
    emit(
        'user_deleted',
        title='User deleted',
        message=f'Account {username} was removed',
        link='/admin/users',
        severity='warning',
        payload={'username': username},
    )


def notify_passkey_added(user: User, passkey_name: str) -> None:
    emit(
        'passkey_added',
        title='Passkey added',
        message=f'Passkey "{passkey_name}" registered for {user.username}',
        link='/settings',
        users=[user],
        severity='info',
    )
    emit(
        'passkey_added',
        title='Passkey added',
        message=f'{user.username} registered passkey "{passkey_name}"',
        link='/admin/users',
        severity='info',
    )


def notify_passkey_removed(user: User, passkey_name: str) -> None:
    emit(
        'passkey_removed',
        title='Passkey removed',
        message=f'Passkey "{passkey_name}" removed from {user.username}',
        link='/settings',
        users=[user],
        severity='warning',
    )
    emit(
        'passkey_removed',
        title='Passkey removed',
        message=f'{user.username} removed passkey "{passkey_name}"',
        link='/admin/users',
        severity='warning',
    )


def notify_new_acquisition(holding_name: str, holding_id: str, vault_name: str) -> None:
    emit(
        'new_acquisition',
        title='New acquisition',
        message=f'{holding_name} added to {vault_name}',
        link=f'/inventory/{holding_id}',
        severity='info',
        payload={'holdingId': holding_id},
    )


def notify_activity(entity_type: str, action: str, entity_label: str, entity_id: str, performed_by: str) -> None:
    event_map = {
        'create': 'activity_create',
        'update': 'activity_update',
        'delete': 'activity_delete',
        'transact': 'activity_transact',
    }
    event_type = event_map.get(action)
    if not event_type:
        return
    emit(
        event_type,
        title=f'{entity_type.title()} {action}',
        message=f'{entity_label} — {action} by {performed_by or "system"}',
        link=_activity_link(entity_type, entity_id),
        severity='info',
        payload={'entityType': entity_type, 'entityId': entity_id, 'action': action},
    )


def _activity_link(entity_type: str, entity_id: str) -> str:
    links = {
        'holding': f'/inventory/{entity_id}',
        'vault': f'/vaults/{entity_id}',
        'site': f'/sites/{entity_id}',
        'audit': '/audits',
        'secret': '/secrets',
    }
    return links.get(entity_type, '/changelog')