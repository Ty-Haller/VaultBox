from django.contrib import admin

from .models import ChangeLog, Document, Holding, Photo, PortfolioSnapshot, Site, Vault


@admin.register(Site)
class SiteAdmin(admin.ModelAdmin):
    list_display = ['name', 'city', 'state', 'country']
    search_fields = ['name', 'city']


@admin.register(Vault)
class VaultAdmin(admin.ModelAdmin):
    list_display = ['name', 'site', 'type', 'security_level']
    list_filter = ['type', 'site']
    search_fields = ['name']


@admin.register(Holding)
class HoldingAdmin(admin.ModelAdmin):
    list_display = ['name', 'asset_class', 'status', 'metal_type', 'vault', 'quantity', 'purchase_date', 'qr_code']
    list_filter = ['asset_class', 'status', 'metal_type', 'form_factor', 'vault']
    search_fields = ['name', 'serial_number', 'qr_code']


@admin.register(ChangeLog)
class ChangeLogAdmin(admin.ModelAdmin):
    list_display = ['created_at', 'action', 'entity_type', 'entity_label', 'performed_by']
    list_filter = ['action', 'entity_type']
    search_fields = ['entity_label', 'entity_id', 'performed_by']
    readonly_fields = ['created_at']


admin.site.register(Photo)
admin.site.register(Document)
admin.site.register(PortfolioSnapshot)