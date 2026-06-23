import uuid

from django.db import models
from slugify import slugify


class Site(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    description = models.TextField(blank=True)
    address = models.CharField(max_length=300, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default='USA')
    postal_code = models.CharField(max_length=20, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    contact_name = models.CharField(max_length=200, blank=True)
    contact_phone = models.CharField(max_length=50, blank=True)
    notes = models.TextField(blank=True)
    tags = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name) or str(self.id)
            slug = base
            counter = 1
            while Site.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f'{base}-{counter}'
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Vault(models.Model):
    VAULT_TYPES = [
        ('home-safe', 'Home Safe'),
        ('bank-deposit', 'Bank Deposit Box'),
        ('private-vault', 'Private Vault'),
        ('cache', 'Cache / Hide'),
        ('depository', 'Depository'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name='vaults')
    type = models.CharField(max_length=20, choices=VAULT_TYPES, default='home-safe')
    description = models.TextField(blank=True)
    manufacturer = models.CharField(max_length=200, blank=True)
    model = models.CharField(max_length=200, blank=True)
    serial_number = models.CharField(max_length=200, blank=True)
    capacity_oz = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    security_level = models.PositiveSmallIntegerField(default=3)
    install_date = models.DateField(null=True, blank=True)
    last_audit_date = models.DateField(null=True, blank=True)
    fire_rating = models.CharField(max_length=100, blank=True)
    weight_capacity_lbs = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    tags = models.JSONField(default=list, blank=True)
    capacity_alert_threshold_pct = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        help_text='Notify when vault fill exceeds this % of capacity',
    )
    audit_interval_days_override = models.PositiveIntegerField(null=True, blank=True)
    audit_reminder_days_override = models.PositiveIntegerField(null=True, blank=True)
    audit_refire_hours_override = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name) or str(self.id)
            slug = base
            counter = 1
            while Vault.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f'{base}-{counter}'
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Holding(models.Model):
    ASSET_CLASSES = [
        ('bullion', 'Bullion / Precious Metals'),
        ('crypto', 'Cryptocurrency'),
        ('currency', 'Fiat Currency'),
        ('gem', 'Gems & Jewelry'),
        ('watch', 'Watches'),
        ('collectible', 'Collectibles'),
        ('other', 'Other'),
    ]
    METAL_TYPES = [
        ('gold', 'Gold'),
        ('silver', 'Silver'),
        ('platinum', 'Platinum'),
        ('palladium', 'Palladium'),
    ]
    WALLET_TYPES = [
        ('hardware', 'Hardware Wallet'),
        ('paper', 'Paper Wallet'),
        ('multisig', 'Multisig'),
        ('hot', 'Hot Wallet'),
        ('exchange', 'Exchange Custody'),
        ('other', 'Other'),
    ]
    FORM_FACTORS = [
        ('bar', 'Bar'),
        ('coin', 'Coin'),
        ('round', 'Round'),
        ('grain', 'Grain / Shot'),
        ('ingot', 'Ingot'),
        ('jewelry', 'Jewelry'),
        ('other', 'Other'),
    ]
    STORAGE_TYPES = [
        ('capsule', 'Capsule'),
        ('tube', 'Tube'),
        ('flip', 'Flip'),
        ('folder', 'Folder'),
        ('slab', 'Slab'),
        ('raw', 'Raw / Loose'),
        ('other', 'Other'),
    ]
    CONDITIONS = [
        ('mint', 'Mint'),
        ('proof', 'Proof'),
        ('bu', 'BU'),
        ('au', 'AU'),
        ('xf', 'XF'),
        ('vf', 'VF'),
        ('raw', 'Raw'),
    ]
    STATUSES = [
        ('active', 'Active'),
        ('sold', 'Sold'),
        ('stolen', 'Stolen'),
        ('deleted', 'Deleted'),
    ]
    TRANSACTION_TYPES = [
        ('sold', 'Sold'),
        ('stolen', 'Stolen'),
        ('deleted', 'Deleted'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    qr_code = models.CharField(max_length=12, unique=True, blank=True)
    name = models.CharField(max_length=300, blank=True, default='')
    sub_name = models.CharField(
        max_length=200, blank=True, default='',
        help_text='Optional label (e.g. tube #3, lot A) — product type provides the base name',
    )
    vault = models.ForeignKey(Vault, on_delete=models.CASCADE, related_name='holdings')
    asset_class = models.CharField(max_length=20, choices=ASSET_CLASSES, default='bullion')
    asset_category = models.ForeignKey(
        'administration.AssetCategory',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='holdings',
    )
    product_type = models.ForeignKey(
        'administration.ProductType',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='holdings',
    )
    metal_type = models.CharField(
        max_length=50, blank=True, default='',
        help_text='Slug from admin Metal Type (gold, silver, copper, …)',
    )
    crypto_token = models.ForeignKey(
        'administration.CryptoTokenType',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='holdings',
    )
    form_factor = models.CharField(max_length=20, choices=FORM_FACTORS, default='coin', blank=True)
    weight_oz = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    purity = models.DecimalField(max_digits=6, decimal_places=4, default=0.9999, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    purchase_date = models.DateField(null=True, blank=True)
    purchase_price = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    purchase_price_per_oz = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    dealer = models.ForeignKey(
        'administration.Dealer',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='holdings',
    )
    invoice_number = models.CharField(max_length=200, blank=True)
    serial_number = models.CharField(max_length=200, blank=True)
    mint = models.CharField(max_length=200, blank=True)
    year = models.PositiveIntegerField(null=True, blank=True)
    country = models.CharField(max_length=100, blank=True)
    condition = models.CharField(max_length=10, choices=CONDITIONS, default='bu')
    grading_service = models.CharField(max_length=50, blank=True)
    grade = models.CharField(max_length=50, blank=True)
    certificate_number = models.CharField(max_length=200, blank=True)
    vault_location = models.CharField(max_length=200, blank=True)
    storage_type = models.CharField(max_length=20, choices=STORAGE_TYPES, blank=True, default='')
    storage_notes = models.CharField(max_length=200, blank=True, default='')
    insured = models.BooleanField(default=False)
    insurance_value = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    # Crypto / cold-wallet fields
    public_address = models.CharField(max_length=256, blank=True)
    crypto_symbol = models.CharField(max_length=20, blank=True)
    crypto_quantity = models.DecimalField(max_digits=24, decimal_places=8, null=True, blank=True)
    wallet_type = models.CharField(max_length=20, choices=WALLET_TYPES, blank=True, default='')
    wallet_location = models.CharField(max_length=300, blank=True)
    encrypted_seed_phrase = models.TextField(blank=True)
    reported_value = models.DecimalField(
        max_digits=16, decimal_places=2, null=True, blank=True,
        help_text='VaultBox-reported USD value for crypto and non-spot assets',
    )
    notes = models.TextField(blank=True)
    tags = models.JSONField(default=list, blank=True)
    value_gain_alert_pct = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        help_text='Alert when unrealized gain exceeds this %',
    )
    value_loss_alert_pct = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        help_text='Alert when unrealized loss exceeds this %',
    )
    status = models.CharField(max_length=20, choices=STATUSES, default='active')
    archived_at = models.DateTimeField(null=True, blank=True)
    transaction_type = models.CharField(
        max_length=20, choices=TRANSACTION_TYPES, blank=True, default='',
    )
    transaction_date = models.DateField(null=True, blank=True)
    sale_price = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    buyer_name = models.CharField(max_length=200, blank=True)
    insurance_claim_number = models.CharField(max_length=200, blank=True)
    transaction_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-purchase_date', 'name']

    @property
    def is_archived(self):
        return self.status != 'active'

    def save(self, *args, **kwargs):
        if not self.qr_code:
            self.qr_code = uuid.uuid4().hex[:12].upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class AuditSession(models.Model):
    STATUSES = [
        ('draft', 'Draft'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    AUDIT_TYPES = [
        ('standard', 'Standard'),
        ('advanced', 'Advanced'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vault = models.ForeignKey(Vault, on_delete=models.CASCADE, related_name='audits')
    status = models.CharField(max_length=20, choices=STATUSES, default='in_progress')
    audit_type = models.CharField(max_length=20, choices=AUDIT_TYPES, default='standard')
    performed_by = models.CharField(max_length=150, blank=True)
    notes = models.TextField(blank=True)
    discrepancy_count = models.PositiveIntegerField(default=0)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f'Audit {self.vault.name} ({self.started_at.date()})'


class AuditLineItem(models.Model):
    LINE_KINDS = [
        ('product_type', 'Product Type'),
        ('holding', 'Holding'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    audit = models.ForeignKey(AuditSession, on_delete=models.CASCADE, related_name='line_items')
    line_kind = models.CharField(max_length=20, choices=LINE_KINDS, default='holding')
    group_key = models.CharField(max_length=120)
    holding = models.ForeignKey(
        Holding, on_delete=models.CASCADE, related_name='audit_lines', null=True, blank=True
    )
    product_type = models.ForeignKey(
        'administration.ProductType',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_lines',
    )
    display_name = models.CharField(max_length=300, blank=True, default='')
    expected_qty = models.PositiveIntegerField()
    current_count = models.PositiveIntegerField(null=True, blank=True)
    counted_qty = models.PositiveIntegerField(null=True, blank=True)
    verified = models.BooleanField(default=False)
    discrepancy_notes = models.TextField(blank=True)

    class Meta:
        ordering = ['display_name']
        constraints = [
            models.UniqueConstraint(fields=['audit', 'group_key'], name='uniq_audit_group_key'),
        ]

    def __str__(self):
        label = self.display_name or (self.holding.name if self.holding_id else 'Audit line')
        return f'{label}: {self.counted_qty}/{self.expected_qty}'


class AuditReport(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    audit = models.OneToOneField(AuditSession, on_delete=models.CASCADE, related_name='report')
    report_data = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Report for {self.audit}'


class Secret(models.Model):
    SECRET_TYPES = [
        ('recovery_code', 'Recovery Code'),
        ('seed_phrase', 'Seed Phrase'),
        ('pin', 'PIN / Passphrase'),
        ('key_location', 'Physical Key Location'),
        ('safe_combo', 'Safe Combination'),
        ('qr_backup', 'QR Backup'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vault = models.ForeignKey(Vault, on_delete=models.CASCADE, null=True, blank=True, related_name='secrets')
    site = models.ForeignKey(Site, on_delete=models.CASCADE, null=True, blank=True, related_name='secrets')
    label = models.CharField(max_length=200)
    secret_type = models.CharField(max_length=20, choices=SECRET_TYPES, default='other')
    encrypted_content = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    tags = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['label']

    def __str__(self):
        return self.label


class SecretAttachment(models.Model):
    ATTACHMENT_TYPES = [
        ('photo', 'Photo'),
        ('document', 'Document'),
        ('qr_code', 'QR Code'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    secret = models.ForeignKey(Secret, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='secrets/%Y/%m/')
    filename = models.CharField(max_length=300, blank=True)
    attachment_type = models.CharField(max_length=20, choices=ATTACHMENT_TYPES, default='document')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def save(self, *args, **kwargs):
        if self.file and not self.filename:
            self.filename = self.file.name.split('/')[-1]
        super().save(*args, **kwargs)

    def __str__(self):
        return self.filename or str(self.id)


class Photo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    holding = models.ForeignKey(
        Holding, on_delete=models.CASCADE, related_name='photos', null=True, blank=True
    )
    vault = models.ForeignKey(
        Vault, on_delete=models.CASCADE, related_name='photos', null=True, blank=True
    )
    site = models.ForeignKey(
        Site, on_delete=models.CASCADE, related_name='photos', null=True, blank=True
    )
    image = models.ImageField(upload_to='photos/%Y/%m/')
    caption = models.CharField(max_length=300, blank=True)
    is_primary = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_primary', '-uploaded_at']

    def __str__(self):
        return self.caption or str(self.id)


class Document(models.Model):
    DOC_TYPES = [
        ('invoice', 'Invoice'),
        ('certificate', 'Certificate'),
        ('assay', 'Assay'),
        ('insurance', 'Insurance'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    holding = models.ForeignKey(Holding, on_delete=models.CASCADE, related_name='documents')
    file = models.FileField(upload_to='documents/%Y/%m/')
    filename = models.CharField(max_length=300, blank=True)
    doc_type = models.CharField(max_length=20, choices=DOC_TYPES, default='other')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def save(self, *args, **kwargs):
        if self.file and not self.filename:
            self.filename = self.file.name.split('/')[-1]
        super().save(*args, **kwargs)

    def __str__(self):
        return self.filename or str(self.id)


class ChangeLog(models.Model):
    ACTIONS = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('transact', 'Transact'),
    ]
    ENTITY_TYPES = [
        ('holding', 'Holding'),
        ('vault', 'Vault'),
        ('site', 'Site'),
        ('secret', 'Secret'),
        ('audit', 'Audit'),
        ('photo', 'Photo'),
        ('document', 'Document'),
        ('admin', 'Admin Config'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entity_type = models.CharField(max_length=30, choices=ENTITY_TYPES)
    entity_id = models.CharField(max_length=64)
    entity_label = models.CharField(max_length=300)
    action = models.CharField(max_length=20, choices=ACTIONS)
    performed_by = models.CharField(max_length=150, blank=True)
    changes = models.JSONField(default=dict, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.action} {self.entity_type} {self.entity_label}'


class PortfolioSnapshot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date = models.DateField(unique=True)
    total_value = models.DecimalField(max_digits=16, decimal_places=2)
    total_cost = models.DecimalField(max_digits=16, decimal_places=2)
    gold_oz = models.DecimalField(max_digits=14, decimal_places=4, default=0)
    silver_oz = models.DecimalField(max_digits=14, decimal_places=4, default=0)
    platinum_oz = models.DecimalField(max_digits=14, decimal_places=4, default=0)
    palladium_oz = models.DecimalField(max_digits=14, decimal_places=4, default=0)

    class Meta:
        ordering = ['date']

    def __str__(self):
        return str(self.date)