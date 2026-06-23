from accounts.authentication import CsrfExemptSessionAuthentication
from accounts.permissions import CanViewReports, IsFullAdmin, ScopedInventoryPermission
from accounts.scoping import scope_audits, scope_holdings, scope_secrets, scope_sites, scope_vaults
from rest_framework.permissions import IsAuthenticated


class ScopedInventoryMixin:
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [ScopedInventoryPermission]


class AuthenticatedMixin:
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]


class ReportsMixin:
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [CanViewReports]


class FullAdminMixin:
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsFullAdmin]