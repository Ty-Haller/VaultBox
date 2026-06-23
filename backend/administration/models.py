import uuid

from django.contrib.auth.models import Group, User
from django.db import models
from slugify import slugify


class TimestampedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SiteType(TimestampedModel):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default='#5a7a96')
    icon = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'name']
        verbose_name = 'Site Type'

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name) or str(self.id)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class VaultType(TimestampedModel):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    description = models.TextField(blank=True)
    default_security_level = models.PositiveSmallIntegerField(default=3)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'name']
        verbose_name = 'Vault Type'

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name) or str(self.id)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class MetalType(TimestampedModel):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default='#d4a017')
    api_symbol = models.CharField(max_length=10, blank=True, help_text='e.g. XAU, XAG')
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'name']
        verbose_name = 'Metal Type'

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name) or str(self.id)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class CryptoTokenType(TimestampedModel):
    """User-defined crypto assets — BTC, ETH, Doge, etc."""
    CHAINS = [
        ('bitcoin', 'Bitcoin'),
        ('ethereum', 'Ethereum'),
        ('dogecoin', 'Dogecoin'),
        ('solana', 'Solana'),
        ('litecoin', 'Litecoin'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=120)
    symbol = models.CharField(max_length=20)
    slug = models.SlugField(max_length=140, unique=True, blank=True)
    chain = models.CharField(max_length=20, choices=CHAINS, default='bitcoin')
    coingecko_id = models.CharField(max_length=100, blank=True, help_text='CoinGecko API id for price lookup')
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'name']
        verbose_name = 'Crypto Token Type'

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.symbol) or slugify(self.name) or str(self.id)
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.name} ({self.symbol})'


class Dealer(TimestampedModel):
    """Bullion dealers and acquisition sources."""
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    website = models.URLField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'name']
        verbose_name = 'Dealer'

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name) or str(self.id)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class AssetCategory(TimestampedModel):
    """Top-level asset taxonomy (SD Bullion–style hierarchy)."""
    ASSET_CLASSES = [
        ('bullion', 'Bullion / Precious Metals'),
        ('crypto', 'Cryptocurrency'),
        ('currency', 'Fiat Currency'),
        ('gem', 'Gems & Jewelry'),
        ('watch', 'Watches'),
        ('collectible', 'Collectibles'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140, unique=True, blank=True)
    asset_class = models.CharField(
        max_length=20, choices=ASSET_CLASSES, default='bullion',
        help_text='Which holding asset class this category applies to',
    )
    parent = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.CASCADE, related_name='children'
    )
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)
    color = models.CharField(max_length=7, default='#5a7a96')
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'name']
        verbose_name_plural = 'Asset Categories'

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name) or str(self.id)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class ProductType(TimestampedModel):
    """Specific bullion products — ASE, Gold Buffalo, Silver Maple, etc."""
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    category = models.ForeignKey(
        AssetCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='products'
    )
    metal_type = models.ForeignKey(
        'MetalType', on_delete=models.SET_NULL, null=True, blank=True, related_name='products'
    )
    form_factor = models.ForeignKey(
        'FormFactorType', on_delete=models.SET_NULL, null=True, blank=True, related_name='products'
    )
    description = models.TextField(blank=True)
    mint = models.CharField(max_length=200, blank=True)
    country = models.CharField(max_length=100, blank=True)
    denomination = models.CharField(max_length=100, blank=True)
    standard_weight_oz = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    standard_purity = models.DecimalField(max_digits=6, decimal_places=4, null=True, blank=True)
    kitco_product_ref = models.CharField(
        max_length=100, blank=True, help_text='Kitco product reference for price lookup'
    )
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'name']
        verbose_name = 'Product Type'

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name) or str(self.id)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class FormFactorType(TimestampedModel):
    """Physical form factor — bar, coin, round (not product SKU)."""
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=50, default='coin', blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'name']
        verbose_name = 'Form Factor / Coin Type'

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name) or str(self.id)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Currency(TimestampedModel):
    code = models.CharField(max_length=3, unique=True)
    name = models.CharField(max_length=100)
    symbol = models.CharField(max_length=8, default='$')
    is_default = models.BooleanField(default=False)
    exchange_rate_to_usd = models.DecimalField(max_digits=14, decimal_places=6, default=1)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-is_default', 'code']
        verbose_name_plural = 'Currencies'

    def save(self, *args, **kwargs):
        if self.is_default:
            Currency.objects.filter(is_default=True).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.code} ({self.name})'


class AppSetting(TimestampedModel):
    VALUE_TYPES = [
        ('string', 'String'),
        ('number', 'Number'),
        ('boolean', 'Boolean'),
        ('json', 'JSON'),
    ]
    CATEGORIES = [
        ('general', 'General'),
        ('display', 'Display'),
        ('integration', 'Integration'),
        ('security', 'Security'),
        ('other', 'Other'),
    ]

    key = models.CharField(max_length=100, unique=True)
    value = models.TextField(blank=True)
    value_type = models.CharField(max_length=20, choices=VALUE_TYPES, default='string')
    category = models.CharField(max_length=20, choices=CATEGORIES, default='other')
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['category', 'key']

    def __str__(self):
        return self.key


class NotificationOption(TimestampedModel):
    EVENT_TYPES = [
        ('audit_due', 'Audit Due'),
        ('audit_overdue', 'Audit Overdue'),
        ('audit_completed', 'Audit Completed'),
        ('audit_completed_issues', 'Audit Completed (Issues)'),
        ('audit_canceled', 'Audit Canceled'),
        ('signup_request', 'Signup Request'),
        ('user_created', 'User Created'),
        ('user_deleted', 'User Deleted'),
        ('passkey_added', 'Passkey Added'),
        ('passkey_removed', 'Passkey Removed'),
        ('price_change', 'Spot/Market Price Change'),
        ('asset_value_gain', 'Unrealized Gain Threshold'),
        ('asset_value_loss', 'Unrealized Loss Threshold'),
        ('capacity_warning', 'Vault Capacity Warning'),
        ('new_acquisition', 'New Acquisition'),
        ('insurance_expiry', 'Insurance Expiry'),
        ('activity_create', 'Activity: Created'),
        ('activity_update', 'Activity: Updated'),
        ('activity_delete', 'Activity: Deleted'),
        ('activity_transact', 'Activity: Transaction'),
    ]
    CATEGORIES = [
        ('audit', 'Audits'),
        ('admin', 'Admin & Users'),
        ('market', 'Spot / Market'),
        ('asset', 'Assets & Value'),
        ('activity', 'Activity Log'),
    ]

    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    event_type = models.CharField(max_length=40, choices=EVENT_TYPES, unique=True)
    category = models.CharField(max_length=20, choices=CATEGORIES, default='asset')
    description = models.TextField(blank=True)
    enabled = models.BooleanField(default=True)
    threshold = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    email_notify = models.BooleanField(default=False)
    in_app_notify = models.BooleanField(default=True)
    apprise_notify = models.BooleanField(default=False)
    refire_interval_hours = models.PositiveIntegerField(null=True, blank=True)
    is_system_default = models.BooleanField(default=True)

    class Meta:
        ordering = ['category', 'name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name) or str(self.id)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class RoleNotificationDefault(TimestampedModel):
    ROLES = [
        ('full_admin', 'Full Admin'),
        ('site_admin', 'Site Admin'),
        ('vault_admin', 'Vault Admin'),
        ('viewer', 'Viewer'),
        ('audit_reporting', 'Audit / Reporting'),
    ]

    role = models.CharField(max_length=30, choices=ROLES)
    event_type = models.CharField(max_length=40)
    enabled = models.BooleanField(null=True, blank=True)
    in_app = models.BooleanField(null=True, blank=True)
    email = models.BooleanField(null=True, blank=True)
    apprise = models.BooleanField(null=True, blank=True)
    threshold = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    refire_interval_hours = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        unique_together = [('role', 'event_type')]
        ordering = ['role', 'event_type']


class UserNotificationPreference(TimestampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notification_preferences')
    event_type = models.CharField(max_length=40)
    enabled = models.BooleanField(null=True, blank=True)
    in_app = models.BooleanField(null=True, blank=True)
    email = models.BooleanField(null=True, blank=True)
    apprise = models.BooleanField(null=True, blank=True)
    threshold = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    refire_interval_hours = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        unique_together = [('user', 'event_type')]
        ordering = ['event_type']


class BackupRecord(TimestampedModel):
    TRIGGERS = [
        ('manual', 'Manual'),
        ('scheduled', 'Scheduled'),
        ('pre_restore', 'Pre-restore safety'),
    ]
    STATUSES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    filename = models.CharField(max_length=255, blank=True)
    size_bytes = models.BigIntegerField(default=0)
    trigger = models.CharField(max_length=20, choices=TRIGGERS, default='manual')
    status = models.CharField(max_length=20, choices=STATUSES, default='pending')
    error = models.TextField(blank=True)
    include_media = models.BooleanField(default=True)
    encrypted = models.BooleanField(default=False)
    rclone_remote_id = models.CharField(max_length=100, blank=True)
    rclone_uploaded = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']


class Notification(TimestampedModel):
    SEVERITIES = [
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('critical', 'Critical'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    event_type = models.CharField(max_length=40)
    severity = models.CharField(max_length=10, choices=SEVERITIES, default='info')
    title = models.CharField(max_length=200)
    message = models.TextField()
    link = models.CharField(max_length=300, blank=True)
    payload = models.JSONField(default=dict, blank=True)
    dedupe_key = models.CharField(max_length=200, blank=True, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    dismissed_at = models.DateTimeField(null=True, blank=True)
    emailed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'dismissed_at', '-created_at']),
        ]


class AuditWorkflow(TimestampedModel):
    APPLIES_TO = [
        ('vault', 'Vault'),
        ('site', 'Site'),
        ('holding', 'Holding'),
        ('all', 'All'),
    ]
    AUDIT_TYPES = [
        ('standard', 'Standard'),
        ('advanced', 'Advanced'),
    ]

    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    description = models.TextField(blank=True)
    applies_to = models.CharField(max_length=20, choices=APPLIES_TO, default='vault')
    interval_days = models.PositiveIntegerField(default=90)
    reminder_days_before = models.PositiveIntegerField(default=14)
    enabled = models.BooleanField(default=True)
    auto_create_tasks = models.BooleanField(default=True)
    audit_type = models.CharField(
        max_length=20, choices=AUDIT_TYPES, default='standard',
        help_text='Standard = full table; Advanced = one item at a time',
    )

    class Meta:
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name) or str(self.id)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class UserProfile(TimestampedModel):
    THEME_CHOICES = [
        ('light', 'Light'),
        ('dark', 'Dark'),
        ('system', 'System'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    display_name = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    is_admin = models.BooleanField(default=False)
    theme = models.CharField(max_length=10, choices=THEME_CHOICES, default='light')
    apprise_urls = models.JSONField(default=list, blank=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return self.display_name or self.user.username