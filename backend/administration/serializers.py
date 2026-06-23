from django.contrib.auth.models import Group, Permission, User
from rest_framework import serializers

from .models import (
    AppSetting,
    AssetCategory,
    AuditWorkflow,
    BackupRecord,
    CryptoTokenType,
    Currency,
    Dealer,
    FormFactorType,
    MetalType,
    Notification,
    NotificationOption,
    ProductType,
    RoleNotificationDefault,
    SiteType,
    UserNotificationPreference,
    UserProfile,
    VaultType,
)


class SiteTypeSerializer(serializers.ModelSerializer):
    isActive = serializers.BooleanField(source='is_active', default=True)
    sortOrder = serializers.IntegerField(source='sort_order', default=0)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = SiteType
        fields = ['id', 'name', 'slug', 'description', 'color', 'icon', 'isActive', 'sortOrder', 'createdAt', 'updatedAt']
        read_only_fields = ['id', 'slug', 'createdAt', 'updatedAt']


class VaultTypeSerializer(serializers.ModelSerializer):
    defaultSecurityLevel = serializers.IntegerField(source='default_security_level', default=3)
    isActive = serializers.BooleanField(source='is_active', default=True)
    sortOrder = serializers.IntegerField(source='sort_order', default=0)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = VaultType
        fields = ['id', 'name', 'slug', 'description', 'defaultSecurityLevel', 'isActive', 'sortOrder', 'createdAt', 'updatedAt']
        read_only_fields = ['id', 'slug', 'createdAt', 'updatedAt']


class MetalTypeSerializer(serializers.ModelSerializer):
    apiSymbol = serializers.CharField(source='api_symbol', required=False, allow_blank=True)
    isActive = serializers.BooleanField(source='is_active', default=True)
    sortOrder = serializers.IntegerField(source='sort_order', default=0)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = MetalType
        fields = ['id', 'name', 'slug', 'description', 'color', 'apiSymbol', 'isActive', 'sortOrder', 'createdAt', 'updatedAt']
        read_only_fields = ['id', 'slug', 'createdAt', 'updatedAt']


class CryptoTokenTypeSerializer(serializers.ModelSerializer):
    coingeckoId = serializers.CharField(source='coingecko_id', required=False, allow_blank=True)
    isActive = serializers.BooleanField(source='is_active', default=True)
    sortOrder = serializers.IntegerField(source='sort_order', default=0)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = CryptoTokenType
        fields = [
            'id', 'name', 'symbol', 'slug', 'chain', 'coingeckoId', 'description',
            'isActive', 'sortOrder', 'createdAt', 'updatedAt',
        ]
        read_only_fields = ['id', 'slug', 'createdAt', 'updatedAt']


class DealerSerializer(serializers.ModelSerializer):
    isActive = serializers.BooleanField(source='is_active', default=True)
    sortOrder = serializers.IntegerField(source='sort_order', default=0)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = Dealer
        fields = [
            'id', 'name', 'slug', 'website', 'phone', 'email', 'notes',
            'isActive', 'sortOrder', 'createdAt', 'updatedAt',
        ]
        read_only_fields = ['id', 'slug', 'createdAt', 'updatedAt']


class AssetCategorySerializer(serializers.ModelSerializer):
    parentId = serializers.PrimaryKeyRelatedField(
        source='parent', queryset=AssetCategory.objects.all(), required=False, allow_null=True
    )
    assetClass = serializers.ChoiceField(
        source='asset_class', choices=AssetCategory.ASSET_CLASSES, default='bullion'
    )
    isActive = serializers.BooleanField(source='is_active', default=True)
    sortOrder = serializers.IntegerField(source='sort_order', default=0)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = AssetCategory
        fields = [
            'id', 'name', 'slug', 'assetClass', 'parentId', 'description', 'icon', 'color',
            'isActive', 'sortOrder', 'createdAt', 'updatedAt',
        ]
        read_only_fields = ['id', 'slug', 'createdAt', 'updatedAt']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['parentId'] = str(instance.parent_id) if instance.parent_id else None
        return data


class ProductTypeSerializer(serializers.ModelSerializer):
    categoryId = serializers.PrimaryKeyRelatedField(
        source='category', queryset=AssetCategory.objects.all(), required=False, allow_null=True
    )
    metalTypeId = serializers.PrimaryKeyRelatedField(
        source='metal_type', queryset=MetalType.objects.all(), required=False, allow_null=True
    )
    formFactorId = serializers.PrimaryKeyRelatedField(
        source='form_factor', queryset=FormFactorType.objects.all(), required=False, allow_null=True
    )
    standardWeightOz = serializers.DecimalField(
        source='standard_weight_oz', max_digits=12, decimal_places=4, required=False, allow_null=True
    )
    standardPurity = serializers.DecimalField(
        source='standard_purity', max_digits=6, decimal_places=4, required=False, allow_null=True
    )
    kitcoProductRef = serializers.CharField(source='kitco_product_ref', required=False, allow_blank=True)
    isActive = serializers.BooleanField(source='is_active', default=True)
    sortOrder = serializers.IntegerField(source='sort_order', default=0)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = ProductType
        fields = [
            'id', 'name', 'slug', 'categoryId', 'metalTypeId', 'formFactorId', 'description',
            'mint', 'country', 'denomination', 'standardWeightOz', 'standardPurity',
            'kitcoProductRef', 'isActive', 'sortOrder', 'createdAt', 'updatedAt',
        ]
        read_only_fields = ['id', 'slug', 'createdAt', 'updatedAt']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['categoryId'] = str(instance.category_id) if instance.category_id else None
        data['metalTypeId'] = str(instance.metal_type_id) if instance.metal_type_id else None
        data['formFactorId'] = str(instance.form_factor_id) if instance.form_factor_id else None
        data['metalSlug'] = instance.metal_type.slug if instance.metal_type_id else None
        data['formFactorSlug'] = instance.form_factor.slug if instance.form_factor_id else None
        data['standardWeightOz'] = float(instance.standard_weight_oz) if instance.standard_weight_oz else None
        data['standardPurity'] = float(instance.standard_purity) if instance.standard_purity else None
        return data


class FormFactorTypeSerializer(serializers.ModelSerializer):
    isActive = serializers.BooleanField(source='is_active', default=True)
    sortOrder = serializers.IntegerField(source='sort_order', default=0)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = FormFactorType
        fields = ['id', 'name', 'slug', 'description', 'category', 'isActive', 'sortOrder', 'createdAt', 'updatedAt']
        read_only_fields = ['id', 'slug', 'createdAt', 'updatedAt']


class CurrencySerializer(serializers.ModelSerializer):
    isDefault = serializers.BooleanField(source='is_default', default=False)
    exchangeRateToUsd = serializers.DecimalField(source='exchange_rate_to_usd', max_digits=14, decimal_places=6, default=1)
    isActive = serializers.BooleanField(source='is_active', default=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = Currency
        fields = ['id', 'code', 'name', 'symbol', 'isDefault', 'exchangeRateToUsd', 'isActive', 'createdAt', 'updatedAt']
        read_only_fields = ['id', 'createdAt', 'updatedAt']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['exchangeRateToUsd'] = float(instance.exchange_rate_to_usd)
        return data


class AppSettingSerializer(serializers.ModelSerializer):
    valueType = serializers.ChoiceField(source='value_type', choices=AppSetting.VALUE_TYPES, default='string')
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = AppSetting
        fields = ['id', 'key', 'value', 'valueType', 'category', 'description', 'createdAt', 'updatedAt']
        read_only_fields = ['id', 'createdAt', 'updatedAt']


class NotificationOptionSerializer(serializers.ModelSerializer):
    eventType = serializers.ChoiceField(source='event_type', choices=NotificationOption.EVENT_TYPES)
    emailNotify = serializers.BooleanField(source='email_notify', default=False)
    inAppNotify = serializers.BooleanField(source='in_app_notify', default=True)
    appriseNotify = serializers.BooleanField(source='apprise_notify', default=False)
    refireIntervalHours = serializers.IntegerField(source='refire_interval_hours', required=False, allow_null=True)
    isSystemDefault = serializers.BooleanField(source='is_system_default', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = NotificationOption
        fields = [
            'id', 'name', 'slug', 'eventType', 'category', 'description', 'enabled', 'threshold',
            'emailNotify', 'inAppNotify', 'appriseNotify', 'refireIntervalHours', 'isSystemDefault',
            'createdAt', 'updatedAt',
        ]
        read_only_fields = ['id', 'slug', 'createdAt', 'updatedAt']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['threshold'] = float(instance.threshold) if instance.threshold is not None else None
        return data


class NotificationInboxSerializer(serializers.ModelSerializer):
    eventType = serializers.CharField(source='event_type')
    createdAt = serializers.DateTimeField(source='created_at')
    readAt = serializers.DateTimeField(source='read_at', allow_null=True)

    class Meta:
        model = Notification
        fields = ['id', 'eventType', 'severity', 'title', 'message', 'link', 'payload', 'readAt', 'createdAt']


class UserNotificationPreferenceSerializer(serializers.ModelSerializer):
    eventType = serializers.CharField(source='event_type')
    inApp = serializers.BooleanField(source='in_app', allow_null=True, required=False)
    refireIntervalHours = serializers.IntegerField(source='refire_interval_hours', allow_null=True, required=False)

    class Meta:
        model = UserNotificationPreference
        fields = ['eventType', 'enabled', 'inApp', 'email', 'apprise', 'threshold', 'refireIntervalHours']


class RoleNotificationDefaultSerializer(serializers.ModelSerializer):
    eventType = serializers.CharField(source='event_type')
    inApp = serializers.BooleanField(source='in_app', allow_null=True, required=False)
    refireIntervalHours = serializers.IntegerField(source='refire_interval_hours', allow_null=True, required=False)

    class Meta:
        model = RoleNotificationDefault
        fields = ['id', 'role', 'eventType', 'enabled', 'inApp', 'email', 'apprise', 'threshold', 'refireIntervalHours']


class AuditWorkflowSerializer(serializers.ModelSerializer):
    appliesTo = serializers.ChoiceField(source='applies_to', choices=AuditWorkflow.APPLIES_TO, default='vault')
    auditType = serializers.ChoiceField(source='audit_type', choices=AuditWorkflow.AUDIT_TYPES, default='standard')
    intervalDays = serializers.IntegerField(source='interval_days', default=90)
    reminderDaysBefore = serializers.IntegerField(source='reminder_days_before', default=14)
    autoCreateTasks = serializers.BooleanField(source='auto_create_tasks', default=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = AuditWorkflow
        fields = [
            'id', 'name', 'slug', 'description', 'appliesTo', 'auditType',
            'intervalDays', 'reminderDaysBefore', 'enabled', 'autoCreateTasks',
            'createdAt', 'updatedAt',
        ]
        read_only_fields = ['id', 'slug', 'createdAt', 'updatedAt']


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'name', 'codename']


class GroupSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)
    permissionIds = serializers.PrimaryKeyRelatedField(
        source='permissions', queryset=Permission.objects.all(), many=True, write_only=True, required=False
    )

    class Meta:
        model = Group
        fields = ['id', 'name', 'permissions', 'permissionIds']


class UserSerializer(serializers.ModelSerializer):
    groups = GroupSerializer(many=True, read_only=True)
    groupIds = serializers.PrimaryKeyRelatedField(
        source='groups', queryset=Group.objects.all(), many=True, write_only=True, required=False
    )
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    isActive = serializers.BooleanField(source='is_active', default=True)
    isStaff = serializers.BooleanField(source='is_staff', default=False)
    isSuperuser = serializers.BooleanField(source='is_superuser', default=False)
    displayName = serializers.CharField(required=False, allow_blank=True, default='')
    phone = serializers.CharField(required=False, allow_blank=True, default='')
    isAdmin = serializers.BooleanField(required=False, default=False)
    dateJoined = serializers.DateTimeField(source='date_joined', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'password',
            'isActive', 'isStaff', 'isSuperuser', 'groups', 'groupIds',
            'displayName', 'phone', 'isAdmin', 'dateJoined',
        ]
        read_only_fields = ['id', 'dateJoined']

    def _profile_fields(self, validated_data):
        return {
            'display_name': validated_data.pop('displayName', ''),
            'phone': validated_data.pop('phone', ''),
            'is_admin': validated_data.pop('isAdmin', False),
        }

    def create(self, validated_data):
        profile_data = self._profile_fields(validated_data)
        groups = validated_data.pop('groups', [])
        validated_data.pop('password', None)
        user = User(**validated_data)
        user.set_unusable_password()
        user.save()
        user.groups.set(groups)
        UserProfile.objects.create(user=user, **profile_data)
        return user

    def update(self, instance, validated_data):
        profile_data = self._profile_fields(validated_data)
        groups = validated_data.pop('groups', None)
        validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if groups is not None:
            instance.groups.set(groups)
        profile, _ = UserProfile.objects.get_or_create(user=instance)
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()
        return instance

    def to_representation(self, instance):
        profile, _ = UserProfile.objects.get_or_create(user=instance)
        data = super().to_representation(instance)
        data['displayName'] = profile.display_name
        data['phone'] = profile.phone
        data['isAdmin'] = profile.is_admin
        return data


class BackupRecordSerializer(serializers.ModelSerializer):
    sizeBytes = serializers.SerializerMethodField()
    includeMedia = serializers.BooleanField(source='include_media', read_only=True)
    rcloneRemoteId = serializers.CharField(source='rclone_remote_id', read_only=True)
    rcloneUploaded = serializers.BooleanField(source='rclone_uploaded', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    def get_sizeBytes(self, obj):
        return obj.size_bytes

    class Meta:
        model = BackupRecord
        fields = [
            'id', 'filename', 'sizeBytes', 'trigger', 'status', 'error',
            'includeMedia', 'encrypted', 'rcloneRemoteId', 'rcloneUploaded', 'createdAt',
        ]