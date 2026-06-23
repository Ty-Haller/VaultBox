from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .backup_views import (
    BackupDetailView,
    BackupDownloadView,
    BackupListCreateView,
    BackupRestoreView,
    BackupRcloneTestView,
    BackupRcloneView,
    BackupScheduleView,
    BackupStorageInfoView,
    BackupUploadRestoreView,
)
from .site_views import SiteConfigView
from .sso_views import SsoConfigView
from .notification_views import (
    MarketAlertConfigView,
    NotificationDefaultsResetView,
    NotificationDeliveryView,
    NotificationOptionListView,
    RoleNotificationDefaultViewSet,
)
from .views import (
    AppSettingViewSet,
    AssetCategoryViewSet,
    AuditWorkflowViewSet,
    CryptoTokenTypeViewSet,
    CurrencyViewSet,
    DealerViewSet,
    FormFactorTypeViewSet,
    GroupViewSet,
    MetalTypeViewSet,
    NotificationOptionViewSet,
    PermissionViewSet,
    ProductTypeViewSet,
    SiteTypeViewSet,
    UserViewSet,
    VaultTypeViewSet,
)

router = DefaultRouter()
router.register('site-types', SiteTypeViewSet, basename='site-type')
router.register('vault-types', VaultTypeViewSet, basename='vault-type')
router.register('metal-types', MetalTypeViewSet, basename='metal-type')
router.register('crypto-tokens', CryptoTokenTypeViewSet, basename='crypto-token')
router.register('dealers', DealerViewSet, basename='dealer')
router.register('asset-categories', AssetCategoryViewSet, basename='asset-category')
router.register('product-types', ProductTypeViewSet, basename='product-type')
router.register('form-factor-types', FormFactorTypeViewSet, basename='form-factor-type')
router.register('currencies', CurrencyViewSet, basename='currency')
router.register('settings', AppSettingViewSet, basename='app-setting')
router.register('notification-options', NotificationOptionViewSet, basename='notification-option')
router.register('audit-workflows', AuditWorkflowViewSet, basename='audit-workflow')
router.register('users', UserViewSet, basename='user')
router.register('groups', GroupViewSet, basename='group')
router.register('permissions', PermissionViewSet, basename='permission')
router.register('role-notification-defaults', RoleNotificationDefaultViewSet, basename='role-notification-default')

urlpatterns = [
    path('backups/', BackupListCreateView.as_view(), name='backup-list'),
    path('backups/restore-upload/', BackupUploadRestoreView.as_view(), name='backup-restore-upload'),
    path('backups/schedule/', BackupScheduleView.as_view(), name='backup-schedule'),
    path('backups/rclone/', BackupRcloneView.as_view(), name='backup-rclone'),
    path('backups/rclone/test/', BackupRcloneTestView.as_view(), name='backup-rclone-test'),
    path('backups/storage/', BackupStorageInfoView.as_view(), name='backup-storage'),
    path('backups/<uuid:backup_id>/', BackupDetailView.as_view(), name='backup-detail'),
    path('backups/<uuid:backup_id>/download/', BackupDownloadView.as_view(), name='backup-download'),
    path('backups/<uuid:backup_id>/restore/', BackupRestoreView.as_view(), name='backup-restore'),
    path('notification-defaults/reset/', NotificationDefaultsResetView.as_view(), name='notification-defaults-reset'),
    path('site/', SiteConfigView.as_view(), name='site-config'),
    path('sso/', SsoConfigView.as_view(), name='sso-config'),
    path('notification-delivery/', NotificationDeliveryView.as_view(), name='notification-delivery'),
    path('notification-catalog/', NotificationOptionListView.as_view(), name='notification-catalog'),
    path('market-alert-config/', MarketAlertConfigView.as_view(), name='market-alert-config'),
    path('', include(router.urls)),
]