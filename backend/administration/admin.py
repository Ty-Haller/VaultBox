from django.contrib import admin

from .models import (
    AppSetting,
    AuditWorkflow,
    Currency,
    FormFactorType,
    MetalType,
    Notification,
    NotificationOption,
    RoleNotificationDefault,
    SiteType,
    UserNotificationPreference,
    UserProfile,
    VaultType,
)

admin.site.register(SiteType)
admin.site.register(VaultType)
admin.site.register(MetalType)
admin.site.register(FormFactorType)
admin.site.register(Currency)
admin.site.register(AppSetting)
admin.site.register(NotificationOption)
admin.site.register(RoleNotificationDefault)
admin.site.register(UserNotificationPreference)
admin.site.register(Notification)
admin.site.register(AuditWorkflow)
admin.site.register(UserProfile)