from rest_framework.permissions import BasePermission, SAFE_METHODS

from .access import get_user_access


class IsAuthenticatedUser(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class IsFullAdmin(BasePermission):
    def has_permission(self, request, view):
        access = get_user_access(request.user)
        return access.can_manage_users() or access.is_full_admin


class CanManageRoles(BasePermission):
    def has_permission(self, request, view):
        access = get_user_access(request.user)
        return access.can_manage_roles() or access.can_manage_users() or access.is_full_admin


class CanAccessAdminConfig(BasePermission):
    def has_permission(self, request, view):
        return get_user_access(request.user).can_access_admin_config()


class CanViewReports(BasePermission):
    def has_permission(self, request, view):
        return get_user_access(request.user).can_view_reports()


class ScopedInventoryPermission(BasePermission):
    """Read requires view access; write requires edit access at vault/site scope."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        access = get_user_access(request.user)
        if access.is_full_admin:
            return True
        if request.method in SAFE_METHODS:
            return bool(access.site_roles or access.vault_roles or access.global_role)
        return True  # object-level checks in has_object_permission

    def has_object_permission(self, request, view, obj):
        access = get_user_access(request.user)
        if access.is_full_admin:
            return True
        model = obj.__class__.__name__
        if model == 'Site':
            if request.method in SAFE_METHODS:
                return access.can_view_site(str(obj.id))
            return access.can_edit_site(str(obj.id))
        if model == 'Vault':
            site_id = str(obj.site_id) if obj.site_id else None
            if request.method in SAFE_METHODS:
                return access.can_view_vault(str(obj.id), site_id)
            return access.can_edit_vault(str(obj.id), site_id)
        if model in ('Holding', 'Secret', 'AuditSession', 'AuditLineItem', 'AuditReport'):
            vault = getattr(obj, 'vault', None)
            if vault is None and hasattr(obj, 'audit_session'):
                vault = obj.audit_session.vault
            if vault is None:
                return False
            site_id = str(vault.site_id) if vault.site_id else None
            if model == 'Secret':
                if request.method in SAFE_METHODS:
                    return access.can_manage_secrets(str(vault.id), site_id)
                return access.can_manage_secrets(str(vault.id), site_id)
            if model in ('AuditSession', 'AuditLineItem', 'AuditReport'):
                if request.method in SAFE_METHODS:
                    return access.can_run_audits(str(vault.id), site_id)
                return access.can_run_audits(str(vault.id), site_id)
            if request.method in SAFE_METHODS:
                return access.can_view_vault(str(vault.id), site_id)
            return access.can_edit_vault(str(vault.id), site_id)
        if model == 'ChangeLog':
            return access.can_view_reports()
        return access.is_full_admin