from django.contrib.auth.models import User
from rest_framework import serializers

from administration.models import UserProfile
from .models import (
    ApiToken,
    PasskeyCredential,
    UserGlobalRole,
    UserSiteRole,
    UserVaultRole,
    VaultBoxRole,
)


class PasskeySerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    lastUsedAt = serializers.DateTimeField(source='last_used_at', read_only=True)

    class Meta:
        model = PasskeyCredential
        fields = ['id', 'name', 'createdAt', 'lastUsedAt']
        read_only_fields = fields


class ApiTokenSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    lastUsedAt = serializers.DateTimeField(source='last_used_at', read_only=True)
    expiresAt = serializers.DateTimeField(source='expires_at', required=False, allow_null=True)
    isActive = serializers.BooleanField(source='is_active')

    class Meta:
        model = ApiToken
        fields = ['id', 'name', 'prefix', 'createdAt', 'lastUsedAt', 'expiresAt', 'isActive']
        read_only_fields = ['id', 'prefix', 'createdAt', 'lastUsedAt']


class ApiTokenCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)


class UserSiteRoleSerializer(serializers.ModelSerializer):
    siteId = serializers.UUIDField(source='site_id')
    siteName = serializers.CharField(source='site.name', read_only=True)
    role = serializers.ChoiceField(choices=VaultBoxRole.choices)

    class Meta:
        model = UserSiteRole
        fields = ['id', 'siteId', 'siteName', 'role']


class UserVaultRoleSerializer(serializers.ModelSerializer):
    vaultId = serializers.UUIDField(source='vault_id')
    vaultName = serializers.CharField(source='vault.name', read_only=True)
    siteId = serializers.UUIDField(source='vault.site_id', read_only=True)
    role = serializers.ChoiceField(choices=VaultBoxRole.choices)

    class Meta:
        model = UserVaultRole
        fields = ['id', 'vaultId', 'vaultName', 'siteId', 'role']


class RoleAssignmentSerializer(serializers.Serializer):
    globalRole = serializers.ChoiceField(
        choices=[('', 'None')] + list(VaultBoxRole.choices),
        required=False, allow_blank=True, allow_null=True,
    )
    siteRoles = serializers.ListField(
        child=serializers.DictField(), required=False, default=list,
    )
    vaultRoles = serializers.ListField(
        child=serializers.DictField(), required=False, default=list,
    )


class UserPreferencesSerializer(serializers.Serializer):
    theme = serializers.ChoiceField(choices=[('light', 'Light'), ('dark', 'Dark'), ('system', 'System')], required=False)
    displayName = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False)

    def validate_email(self, value):
        if value is not None:
            value = value.strip()
            if not value:
                raise serializers.ValidationError('Email cannot be blank.')
        return value