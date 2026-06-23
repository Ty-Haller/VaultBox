"""Resolve scoped roles, group memberships, and permission checks."""

from __future__ import annotations

from dataclasses import dataclass, field

from django.contrib.auth.models import User

from .models import (
    ROLE_RANK,
    GroupSiteAccess,
    GroupVaultAccess,
    Role,
    UserGlobalRole,
    UserGroup,
    UserSiteRole,
    UserVaultRole,
    VaultBoxRole,
)
from .permissions_catalog import DEFAULT_ROLE_PERMISSIONS, PERMISSIONS


@dataclass
class UserAccess:
    global_role: str | None = None
    site_roles: dict[str, str] = field(default_factory=dict)
    vault_roles: dict[str, str] = field(default_factory=dict)
    permissions: set[str] = field(default_factory=set)
    group_ids: list[str] = field(default_factory=list)

    @property
    def is_full_admin(self) -> bool:
        return self.global_role == VaultBoxRole.FULL_ADMIN

    def _rank(self, role: str | None) -> int:
        if not role:
            return 0
        return ROLE_RANK.get(role, 0)

    def _best(self, *roles: str | None) -> str | None:
        ranked = [(r, self._rank(r)) for r in roles if r]
        if not ranked:
            return None
        return max(ranked, key=lambda x: x[1])[0]

    def has_permission(self, key: str) -> bool:
        if self.is_full_admin:
            return True
        return key in self.permissions

    def effective_site_role(self, site_id: str) -> str | None:
        if self.is_full_admin:
            return VaultBoxRole.FULL_ADMIN
        return self.site_roles.get(str(site_id))

    def effective_vault_role(self, vault_id: str, site_id: str | None = None) -> str | None:
        if self.is_full_admin:
            return VaultBoxRole.FULL_ADMIN
        vault_role = self.vault_roles.get(str(vault_id))
        site_role = self.site_roles.get(str(site_id)) if site_id else None
        return self._best(vault_role, site_role)

    def accessible_site_ids(self) -> set[str] | None:
        if self.is_full_admin:
            return None
        ids = set(self.site_roles.keys())
        if self.vault_roles:
            from inventory.models import Vault
            for vid in self.vault_roles:
                site_id = Vault.objects.filter(pk=vid).values_list('site_id', flat=True).first()
                if site_id:
                    ids.add(str(site_id))
        return ids

    def accessible_vault_ids(self) -> set[str] | None:
        if self.is_full_admin:
            return None
        ids = set(self.vault_roles.keys())
        for site_id in self.site_roles:
            from inventory.models import Vault
            for vid in Vault.objects.filter(site_id=site_id).values_list('id', flat=True):
                ids.add(str(vid))
        return ids

    def can_view_site(self, site_id: str) -> bool:
        return self.has_permission('view_sites') and (
            self.is_full_admin or str(site_id) in self.site_roles or self._vault_on_site(site_id)
        )

    def _vault_on_site(self, site_id: str) -> bool:
        from inventory.models import Vault
        vault_ids = self.accessible_vault_ids() or set()
        return Vault.objects.filter(site_id=site_id, id__in=vault_ids).exists()

    def can_edit_site(self, site_id: str) -> bool:
        return self.has_permission('edit_sites') and self._rank(self.effective_site_role(site_id)) >= ROLE_RANK[VaultBoxRole.SITE_ADMIN]

    def can_view_vault(self, vault_id: str, site_id: str | None = None) -> bool:
        return self.has_permission('view_vaults') and (
            self.is_full_admin or str(vault_id) in self.vault_roles
            or (site_id and str(site_id) in self.site_roles)
        )

    def can_edit_vault(self, vault_id: str, site_id: str | None = None) -> bool:
        return self.has_permission('edit_vaults') and self._rank(self.effective_vault_role(vault_id, site_id)) >= ROLE_RANK[VaultBoxRole.VAULT_ADMIN]

    def can_view_reports(self) -> bool:
        return self.has_permission('view_reports')

    def can_run_audits(self, vault_id: str, site_id: str | None = None) -> bool:
        if not self.has_permission('run_audits'):
            return False
        return self._rank(self.effective_vault_role(vault_id, site_id)) >= ROLE_RANK[VaultBoxRole.AUDIT_REPORTING]

    def can_manage_secrets(self, vault_id: str, site_id: str | None = None) -> bool:
        if not self.has_permission('manage_secrets'):
            return False
        return self._rank(self.effective_vault_role(vault_id, site_id)) >= ROLE_RANK[VaultBoxRole.VAULT_ADMIN]

    def can_manage_users(self) -> bool:
        return self.has_permission('manage_users')

    def can_access_admin_config(self) -> bool:
        return self.has_permission('manage_admin')

    def can_manage_roles(self) -> bool:
        return self.has_permission('manage_roles')

    def can_edit_market_alerts(self) -> bool:
        return self.has_permission('edit_market_alerts')

    def to_dict(self) -> dict:
        return {
            'globalRole': self.global_role,
            'siteRoles': self.site_roles,
            'vaultRoles': self.vault_roles,
            'permissions': sorted(self.permissions),
            'groupIds': self.group_ids,
            'isFullAdmin': self.is_full_admin,
            'canManageUsers': self.can_manage_users(),
            'canAccessAdmin': self.can_access_admin_config(),
            'canManageRoles': self.can_manage_roles(),
            'canViewReports': self.can_view_reports(),
            'canEditMarketAlerts': self.can_edit_market_alerts(),
        }


def _slug_to_role_key(slug: str) -> str | None:
    for key in ROLE_RANK:
        if slug == key or slug.replace('-', '_') == key:
            return key
    return None


def _permissions_for_role_slug(slug: str, role_obj: Role | None = None) -> set[str]:
    if role_obj and role_obj.permissions:
        return set(role_obj.permissions)
    key = _slug_to_role_key(slug)
    if key and key in DEFAULT_ROLE_PERMISSIONS:
        return set(DEFAULT_ROLE_PERMISSIONS[key])
    return set(role_obj.permissions) if role_obj else set()


def get_user_access(user: User | None) -> UserAccess:
    if not user or not user.is_authenticated:
        return UserAccess()

    access = UserAccess()
    try:
        access.global_role = user.global_role.role
        access.permissions |= _permissions_for_role_slug(access.global_role)
    except UserGlobalRole.DoesNotExist:
        pass

    for sr in user.site_roles.select_related('site').all():
        sid = str(sr.site_id)
        existing = access.site_roles.get(sid)
        access.site_roles[sid] = access._best(existing, sr.role) or sr.role
        access.permissions |= _permissions_for_role_slug(sr.role)

    for vr in user.vault_roles.select_related('vault').all():
        vid = str(vr.vault_id)
        existing = access.vault_roles.get(vid)
        access.vault_roles[vid] = access._best(existing, vr.role) or vr.role
        access.permissions |= _permissions_for_role_slug(vr.role)

    groups = UserGroup.objects.filter(members=user, is_active=True).select_related('role').prefetch_related(
        'site_access', 'vault_access',
    )
    for group in groups:
        access.group_ids.append(str(group.id))
        role_slug = group.role.slug
        role_key = _slug_to_role_key(role_slug) or role_slug
        perms = _permissions_for_role_slug(role_slug, group.role)
        access.permissions |= perms

        for sa in group.site_access.all():
            sid = str(sa.site_id)
            existing = access.site_roles.get(sid)
            access.site_roles[sid] = access._best(existing, role_key) or role_key

        for va in group.vault_access.all():
            vid = str(va.vault_id)
            existing = access.vault_roles.get(vid)
            access.vault_roles[vid] = access._best(existing, role_key) or role_key
            from inventory.models import Vault
            site_id = Vault.objects.filter(pk=va.vault_id).values_list('site_id', flat=True).first()
            if site_id:
                sid = str(site_id)
                existing_site = access.site_roles.get(sid)
                access.site_roles[sid] = access._best(existing_site, role_key) or role_key

    if access.global_role == VaultBoxRole.FULL_ADMIN:
        access.permissions = set(PERMISSIONS.keys())

    return access