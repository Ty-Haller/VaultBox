import hashlib
import secrets
import uuid

from django.conf import settings
from django.contrib.auth.models import User
from django.db import models


class VaultBoxRole(models.TextChoices):
    FULL_ADMIN = 'full_admin', 'Full Admin'
    SITE_ADMIN = 'site_admin', 'Site Admin'
    VAULT_ADMIN = 'vault_admin', 'Vault Admin'
    VIEWER = 'viewer', 'Viewer'
    AUDIT_REPORTING = 'audit_reporting', 'Audit & Reporting'


ROLE_RANK = {
    VaultBoxRole.VIEWER: 1,
    VaultBoxRole.AUDIT_REPORTING: 2,
    VaultBoxRole.VAULT_ADMIN: 3,
    VaultBoxRole.SITE_ADMIN: 4,
    VaultBoxRole.FULL_ADMIN: 5,
}


class TimestampedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class UserGlobalRole(TimestampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='global_role')
    role = models.CharField(max_length=30, choices=VaultBoxRole.choices)

    class Meta:
        verbose_name = 'Global Role'

    def __str__(self):
        return f'{self.user.username} — {self.get_role_display()}'


class UserSiteRole(TimestampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='site_roles')
    site = models.ForeignKey('inventory.Site', on_delete=models.CASCADE, related_name='user_roles')
    role = models.CharField(max_length=30, choices=VaultBoxRole.choices)

    class Meta:
        unique_together = [('user', 'site')]
        verbose_name = 'Site Role'

    def __str__(self):
        return f'{self.user.username} @ {self.site.name} — {self.get_role_display()}'


class UserVaultRole(TimestampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vault_roles')
    vault = models.ForeignKey('inventory.Vault', on_delete=models.CASCADE, related_name='user_roles')
    role = models.CharField(max_length=30, choices=VaultBoxRole.choices)

    class Meta:
        unique_together = [('user', 'vault')]
        verbose_name = 'Vault Role'

    def __str__(self):
        return f'{self.user.username} @ {self.vault.name} — {self.get_role_display()}'


class PasskeyCredential(TimestampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='passkeys')
    name = models.CharField(max_length=120, default='Passkey')
    credential_id = models.TextField(unique=True)
    public_key = models.TextField()
    sign_count = models.PositiveIntegerField(default=0)
    transports = models.JSONField(default=list, blank=True)
    aaguid = models.CharField(max_length=64, blank=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.user.username})'


class OAuthIdentity(TimestampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='oauth_identities')
    provider = models.CharField(max_length=50)
    subject = models.CharField(max_length=255)
    email = models.EmailField(blank=True)
    display_name = models.CharField(max_length=200, blank=True)

    class Meta:
        unique_together = [('provider', 'subject')]
        ordering = ['provider', 'email']

    def __str__(self):
        return f'{self.provider}:{self.subject} → {self.user.username}'


class ApiToken(TimestampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_tokens')
    name = models.CharField(max_length=120)
    token_hash = models.CharField(max_length=64, unique=True)
    prefix = models.CharField(max_length=12)
    last_used_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']

    @staticmethod
    def generate_token() -> tuple[str, str, str]:
        raw = secrets.token_urlsafe(32)
        prefix = raw[:8]
        token_hash = hashlib.sha256(raw.encode()).hexdigest()
        return raw, prefix, token_hash

    def __str__(self):
        return f'{self.name} ({self.prefix}…)'


class OAuthState(TimestampedModel):
    """Short-lived PKCE/state storage for OAuth flows."""
    state = models.CharField(max_length=128, unique=True)
    code_verifier = models.CharField(max_length=128)
    provider = models.CharField(max_length=50)
    redirect_after = models.CharField(max_length=500, blank=True)
    link_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='oauth_link_states',
    )

    class Meta:
        indexes = [models.Index(fields=['state'])]


class Role(TimestampedModel):
    """Customizable role with permission set."""
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140, unique=True)
    description = models.TextField(blank=True)
    permissions = models.JSONField(default=list)
    is_system = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name


class UserGroup(TimestampedModel):
    """Collection of users sharing a role, assignable to sites/vaults."""
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    role = models.ForeignKey(Role, on_delete=models.PROTECT, related_name='groups')
    members = models.ManyToManyField(User, blank=True, related_name='vaultbox_groups')
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class GroupSiteAccess(TimestampedModel):
    group = models.ForeignKey(UserGroup, on_delete=models.CASCADE, related_name='site_access')
    site = models.ForeignKey('inventory.Site', on_delete=models.CASCADE, related_name='group_access')

    class Meta:
        unique_together = [('group', 'site')]


class GroupVaultAccess(TimestampedModel):
    group = models.ForeignKey(UserGroup, on_delete=models.CASCADE, related_name='vault_access')
    vault = models.ForeignKey('inventory.Vault', on_delete=models.CASCADE, related_name='group_access')

    class Meta:
        unique_together = [('group', 'vault')]


class SignupRequest(TimestampedModel):
    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    STATUSES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
    ]

    username = models.CharField(max_length=150)
    email = models.EmailField()
    display_name = models.CharField(max_length=150, blank=True)
    message = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUSES, default=STATUS_PENDING)
    reviewed_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name='reviewed_signups',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)
    created_user = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name='signup_request',
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.username} ({self.status})'


class PasskeySetupToken(TimestampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='setup_tokens')
    token_hash = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    @staticmethod
    def generate() -> tuple[str, str]:
        raw = secrets.token_urlsafe(32)
        return raw, hashlib.sha256(raw.encode()).hexdigest()