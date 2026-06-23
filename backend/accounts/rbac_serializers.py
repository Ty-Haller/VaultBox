from django.contrib.auth.models import User
from rest_framework import serializers

from .models import GroupSiteAccess, GroupVaultAccess, Role, SignupRequest, UserGroup
from .permissions_catalog import PERMISSIONS


class RoleSerializer(serializers.ModelSerializer):
    isSystem = serializers.BooleanField(source='is_system', read_only=True)
    sortOrder = serializers.IntegerField(source='sort_order', required=False, default=0)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = Role
        fields = ['id', 'name', 'slug', 'description', 'permissions', 'isSystem', 'sortOrder', 'createdAt', 'updatedAt']
        read_only_fields = ['id', 'slug', 'isSystem', 'createdAt', 'updatedAt']


class PermissionCatalogSerializer(serializers.Serializer):
    key = serializers.CharField()
    label = serializers.CharField()


class UserGroupSerializer(serializers.ModelSerializer):
    roleId = serializers.PrimaryKeyRelatedField(source='role', queryset=Role.objects.all())
    roleName = serializers.CharField(source='role.name', read_only=True)
    memberIds = serializers.PrimaryKeyRelatedField(
        source='members', queryset=User.objects.all(), many=True, required=False,
    )
    siteIds = serializers.ListField(child=serializers.UUIDField(), write_only=True, required=False)
    vaultIds = serializers.ListField(child=serializers.UUIDField(), write_only=True, required=False)
    isActive = serializers.BooleanField(source='is_active', default=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = UserGroup
        fields = [
            'id', 'name', 'description', 'roleId', 'roleName', 'memberIds',
            'siteIds', 'vaultIds', 'isActive', 'createdAt', 'updatedAt',
        ]
        read_only_fields = ['id', 'createdAt', 'updatedAt']

    def _sync_scope(self, group, site_ids=None, vault_ids=None):
        if site_ids is not None:
            GroupSiteAccess.objects.filter(group=group).delete()
            for sid in site_ids:
                GroupSiteAccess.objects.create(group=group, site_id=sid)
        if vault_ids is not None:
            GroupVaultAccess.objects.filter(group=group).delete()
            for vid in vault_ids:
                GroupVaultAccess.objects.create(group=group, vault_id=vid)

    def create(self, validated_data):
        members = validated_data.pop('members', [])
        site_ids = self.initial_data.get('siteIds', [])
        vault_ids = self.initial_data.get('vaultIds', [])
        group = UserGroup.objects.create(**validated_data)
        if members:
            group.members.set(members)
        self._sync_scope(group, site_ids, vault_ids)
        return group

    def update(self, instance, validated_data):
        site_ids = self.initial_data.get('siteIds') if 'siteIds' in self.initial_data else None
        vault_ids = self.initial_data.get('vaultIds') if 'vaultIds' in self.initial_data else None
        members = validated_data.pop('members', None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if members is not None:
            instance.members.set(members)
        if site_ids is not None or vault_ids is not None:
            self._sync_scope(instance, site_ids, vault_ids)
        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['memberIds'] = list(instance.members.values_list('id', flat=True))
        data['siteIds'] = [str(x) for x in instance.site_access.values_list('site_id', flat=True)]
        data['vaultIds'] = [str(x) for x in instance.vault_access.values_list('vault_id', flat=True)]
        return data


class SignupRequestSerializer(serializers.ModelSerializer):
    displayName = serializers.CharField(source='display_name', required=False, allow_blank=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    reviewedAt = serializers.DateTimeField(source='reviewed_at', read_only=True)
    reviewNotes = serializers.CharField(source='review_notes', required=False, allow_blank=True)
    reviewedBy = serializers.CharField(source='reviewed_by.username', read_only=True, allow_null=True)

    class Meta:
        model = SignupRequest
        fields = [
            'id', 'username', 'email', 'displayName', 'message', 'status',
            'reviewedBy', 'reviewedAt', 'reviewNotes', 'createdAt',
        ]
        read_only_fields = ['id', 'status', 'reviewedBy', 'reviewedAt', 'createdAt']


class SignupCreateSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=True)
    displayName = serializers.CharField(required=False, allow_blank=True, default='')
    message = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_username(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Username is required.')
        return value

    def validate_email(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Email is required.')
        return value