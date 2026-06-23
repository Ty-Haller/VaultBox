"""Queryset scoping helpers for inventory viewsets."""

from __future__ import annotations

from django.db.models import Q, QuerySet

from .access import UserAccess, get_user_access


def scope_sites(qs: QuerySet, user) -> QuerySet:
    access = get_user_access(user)
    if access.is_full_admin:
        return qs
    site_ids = access.accessible_site_ids()
    if not site_ids:
        return qs.none()
    return qs.filter(id__in=site_ids)


def scope_vaults(qs: QuerySet, user) -> QuerySet:
    access = get_user_access(user)
    if access.is_full_admin:
        return qs
    vault_ids = access.accessible_vault_ids()
    if not vault_ids:
        return qs.none()
    return qs.filter(id__in=vault_ids)


def scope_holdings(qs: QuerySet, user) -> QuerySet:
    access = get_user_access(user)
    if access.is_full_admin:
        return qs
    vault_ids = access.accessible_vault_ids()
    if not vault_ids:
        return qs.none()
    return qs.filter(vault_id__in=vault_ids)


def scope_secrets(qs: QuerySet, user) -> QuerySet:
    access = get_user_access(user)
    if access.is_full_admin:
        return qs
    vault_ids = [
        vid for vid in (access.accessible_vault_ids() or set())
        if access.can_manage_secrets(vid)
    ]
    if not vault_ids:
        return qs.none()
    return qs.filter(vault_id__in=vault_ids)


def scope_audits(qs: QuerySet, user) -> QuerySet:
    access = get_user_access(user)
    if access.is_full_admin:
        return qs
    vault_ids = access.accessible_vault_ids()
    if not vault_ids:
        return qs.none()
    return qs.filter(vault_id__in=vault_ids)


def can_write_inventory(user, access: UserAccess | None = None) -> bool:
    access = access or get_user_access(user)
    if access.is_full_admin:
        return True
    for role in list(access.site_roles.values()) + list(access.vault_roles.values()):
        from .models import ROLE_RANK, VaultBoxRole
        if ROLE_RANK.get(role, 0) >= ROLE_RANK[VaultBoxRole.VAULT_ADMIN]:
            return True
    return False