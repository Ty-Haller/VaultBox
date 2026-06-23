from accounts.authentication import CsrfExemptSessionAuthentication
from accounts.permissions import CanAccessAdminConfig, IsFullAdmin
from rest_framework.permissions import SAFE_METHODS, BasePermission, IsAuthenticated


class IsAuthenticatedOrReadAdmin(BasePermission):
    """Authenticated users may read reference data; writes require full admin."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        from accounts.access import get_user_access
        return get_user_access(request.user).can_access_admin_config()


class AdminReadMixin:
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticatedOrReadAdmin]


class AdminWriteMixin:
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [CanAccessAdminConfig]


class UserAdminMixin:
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsFullAdmin]