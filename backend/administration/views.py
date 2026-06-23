from django.contrib.auth.models import Group, Permission, User
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from accounts.access import get_user_access
from accounts.authentication import CsrfExemptSessionAuthentication
from accounts.permissions import CanAccessAdminConfig

from .app_settings_policy import PUBLIC_SETTING_KEYS
from .auth_mixins import AdminReadMixin, UserAdminMixin
from .models import (
    AppSetting,
    AssetCategory,
    AuditWorkflow,
    CryptoTokenType,
    Currency,
    Dealer,
    FormFactorType,
    MetalType,
    NotificationOption,
    ProductType,
    SiteType,
    VaultType,
)
from .serializers import (
    AppSettingSerializer,
    AssetCategorySerializer,
    AuditWorkflowSerializer,
    CryptoTokenTypeSerializer,
    CurrencySerializer,
    DealerSerializer,
    FormFactorTypeSerializer,
    GroupSerializer,
    MetalTypeSerializer,
    NotificationOptionSerializer,
    PermissionSerializer,
    ProductTypeSerializer,
    SiteTypeSerializer,
    UserSerializer,
    VaultTypeSerializer,
)


class SiteTypeViewSet(AdminReadMixin, viewsets.ModelViewSet):
    queryset = SiteType.objects.all()
    serializer_class = SiteTypeSerializer
    lookup_field = 'id'


class VaultTypeViewSet(AdminReadMixin, viewsets.ModelViewSet):
    queryset = VaultType.objects.all()
    serializer_class = VaultTypeSerializer
    lookup_field = 'id'


class MetalTypeViewSet(AdminReadMixin, viewsets.ModelViewSet):
    queryset = MetalType.objects.all()
    serializer_class = MetalTypeSerializer
    lookup_field = 'id'


class CryptoTokenTypeViewSet(AdminReadMixin, viewsets.ModelViewSet):
    queryset = CryptoTokenType.objects.all()
    serializer_class = CryptoTokenTypeSerializer
    lookup_field = 'id'


class DealerViewSet(AdminReadMixin, viewsets.ModelViewSet):
    queryset = Dealer.objects.all()
    serializer_class = DealerSerializer
    lookup_field = 'id'


class AssetCategoryViewSet(AdminReadMixin, viewsets.ModelViewSet):
    queryset = AssetCategory.objects.select_related('parent').all()
    serializer_class = AssetCategorySerializer
    lookup_field = 'id'

    def get_queryset(self):
        qs = super().get_queryset()
        asset_class = self.request.query_params.get('assetClass')
        if asset_class:
            qs = qs.filter(asset_class=asset_class)
        return qs


class ProductTypeViewSet(AdminReadMixin, viewsets.ModelViewSet):
    queryset = ProductType.objects.select_related('category', 'metal_type', 'form_factor').all()
    serializer_class = ProductTypeSerializer
    lookup_field = 'id'

    def get_queryset(self):
        qs = super().get_queryset()
        category_id = self.request.query_params.get('category')
        if category_id:
            qs = qs.filter(category_id=category_id)
        return qs


class FormFactorTypeViewSet(AdminReadMixin, viewsets.ModelViewSet):
    queryset = FormFactorType.objects.all()
    serializer_class = FormFactorTypeSerializer
    lookup_field = 'id'


class CurrencyViewSet(AdminReadMixin, viewsets.ModelViewSet):
    queryset = Currency.objects.all()
    serializer_class = CurrencySerializer
    lookup_field = 'id'


class AppSettingViewSet(viewsets.ModelViewSet):
    authentication_classes = [CsrfExemptSessionAuthentication]
    queryset = AppSetting.objects.all()
    serializer_class = AppSettingSerializer
    lookup_field = 'id'

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [CanAccessAdminConfig()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        if get_user_access(self.request.user).can_access_admin_config():
            return qs
        return qs.filter(key__in=PUBLIC_SETTING_KEYS)


class NotificationOptionViewSet(AdminReadMixin, viewsets.ModelViewSet):
    queryset = NotificationOption.objects.all()
    serializer_class = NotificationOptionSerializer
    lookup_field = 'id'


class AuditWorkflowViewSet(AdminReadMixin, viewsets.ModelViewSet):
    queryset = AuditWorkflow.objects.all()
    serializer_class = AuditWorkflowSerializer
    lookup_field = 'id'


class UserViewSet(UserAdminMixin, viewsets.ModelViewSet):
    queryset = User.objects.select_related('profile').prefetch_related('groups').all()
    serializer_class = UserSerializer

    def get_queryset(self):
        return User.objects.select_related('profile').prefetch_related('groups', 'groups__permissions').order_by('username')

    def perform_create(self, serializer):
        user = serializer.save()
        from .notification_hooks import notify_user_created
        notify_user_created(user.username, user.id)

    def perform_destroy(self, instance):
        from accounts.user_policy import validate_user_deletion
        validate_user_deletion(instance)
        username = instance.username
        instance.delete()
        from .notification_hooks import notify_user_deleted
        notify_user_deleted(username)


class GroupViewSet(UserAdminMixin, viewsets.ModelViewSet):
    queryset = Group.objects.prefetch_related('permissions').all()
    serializer_class = GroupSerializer


class PermissionViewSet(UserAdminMixin, viewsets.ReadOnlyModelViewSet):
    queryset = Permission.objects.select_related('content_type').order_by('content_type__app_label', 'codename')
    serializer_class = PermissionSerializer
    pagination_class = None