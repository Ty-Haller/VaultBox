from rest_framework import serializers

from administration.models import AssetCategory, CryptoTokenType, Dealer, ProductType

from .encryption import encrypt_value
from .models import (
    AuditLineItem,
    AuditReport,
    AuditSession,
    ChangeLog,
    Document,
    Holding,
    Photo,
    PortfolioSnapshot,
    Secret,
    SecretAttachment,
    Site,
    Vault,
)


def _decimal(value):
    return float(value) if value is not None else None


class PhotoSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    isPrimary = serializers.BooleanField(source='is_primary', required=False, default=False)
    uploadedAt = serializers.DateTimeField(source='uploaded_at', read_only=True)

    class Meta:
        model = Photo
        fields = ['id', 'url', 'caption', 'isPrimary', 'uploadedAt', 'holding', 'vault', 'site']
        read_only_fields = ['id', 'uploadedAt']

    def get_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        if obj.image:
            return obj.image.url
        return None


class DocumentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    docType = serializers.ChoiceField(source='doc_type', choices=Document.DOC_TYPES, default='other')
    uploadedAt = serializers.DateTimeField(source='uploaded_at', read_only=True)

    class Meta:
        model = Document
        fields = ['id', 'url', 'filename', 'docType', 'uploadedAt', 'holding']
        read_only_fields = ['id', 'uploadedAt', 'filename']

    def get_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        if obj.file:
            return obj.file.url
        return None


class SiteSerializer(serializers.ModelSerializer):
    postalCode = serializers.CharField(source='postal_code', required=False, allow_blank=True)
    contactName = serializers.CharField(source='contact_name', required=False, allow_blank=True)
    contactPhone = serializers.CharField(source='contact_phone', required=False, allow_blank=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    photos = PhotoSerializer(many=True, read_only=True)

    class Meta:
        model = Site
        fields = [
            'id', 'name', 'slug', 'description', 'address', 'city', 'state', 'country',
            'postalCode', 'latitude', 'longitude', 'contactName', 'contactPhone',
            'notes', 'tags', 'photos', 'createdAt', 'updatedAt',
        ]
        read_only_fields = ['id', 'slug', 'createdAt', 'updatedAt']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['latitude'] = _decimal(instance.latitude)
        data['longitude'] = _decimal(instance.longitude)
        return data


class VaultSerializer(serializers.ModelSerializer):
    siteId = serializers.PrimaryKeyRelatedField(source='site', queryset=Site.objects.all())
    capacityOz = serializers.DecimalField(
        source='capacity_oz', max_digits=12, decimal_places=4, required=False, allow_null=True
    )
    securityLevel = serializers.IntegerField(source='security_level', min_value=1, max_value=5)
    installDate = serializers.DateField(source='install_date', required=False, allow_null=True)
    lastAuditDate = serializers.DateField(source='last_audit_date', required=False, allow_null=True)
    fireRating = serializers.CharField(source='fire_rating', required=False, allow_blank=True)
    weightCapacityLbs = serializers.DecimalField(
        source='weight_capacity_lbs', max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    serialNumber = serializers.CharField(source='serial_number', required=False, allow_blank=True)
    capacityAlertThresholdPct = serializers.DecimalField(
        source='capacity_alert_threshold_pct', max_digits=6, decimal_places=2,
        required=False, allow_null=True,
    )
    auditIntervalDaysOverride = serializers.IntegerField(
        source='audit_interval_days_override', required=False, allow_null=True,
    )
    auditReminderDaysOverride = serializers.IntegerField(
        source='audit_reminder_days_override', required=False, allow_null=True,
    )
    auditRefireHoursOverride = serializers.IntegerField(
        source='audit_refire_hours_override', required=False, allow_null=True,
    )
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    photos = PhotoSerializer(many=True, read_only=True)

    class Meta:
        model = Vault
        fields = [
            'id', 'name', 'slug', 'siteId', 'type', 'description', 'manufacturer', 'model',
            'serialNumber', 'capacityOz', 'securityLevel', 'installDate', 'lastAuditDate',
            'fireRating', 'weightCapacityLbs', 'notes', 'tags',
            'capacityAlertThresholdPct', 'auditIntervalDaysOverride',
            'auditReminderDaysOverride', 'auditRefireHoursOverride',
            'photos', 'createdAt', 'updatedAt',
        ]
        read_only_fields = ['id', 'slug', 'createdAt', 'updatedAt']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['siteId'] = str(instance.site_id)
        data['capacityOz'] = _decimal(instance.capacity_oz)
        data['weightCapacityLbs'] = _decimal(instance.weight_capacity_lbs)
        data['capacityAlertThresholdPct'] = _decimal(instance.capacity_alert_threshold_pct)
        return data


class HoldingSerializer(serializers.ModelSerializer):
    name = serializers.CharField(required=False, allow_blank=True)
    subName = serializers.CharField(source='sub_name', required=False, allow_blank=True)
    vaultId = serializers.PrimaryKeyRelatedField(source='vault', queryset=Vault.objects.all())
    assetClass = serializers.ChoiceField(source='asset_class', choices=Holding.ASSET_CLASSES, default='bullion')
    assetCategoryId = serializers.PrimaryKeyRelatedField(
        source='asset_category', queryset=AssetCategory.objects.all(), required=False, allow_null=True
    )
    productTypeId = serializers.PrimaryKeyRelatedField(
        source='product_type', queryset=ProductType.objects.all(), required=False, allow_null=True
    )
    metalType = serializers.CharField(source='metal_type', required=False, allow_blank=True)
    cryptoTokenTypeId = serializers.PrimaryKeyRelatedField(
        source='crypto_token', queryset=CryptoTokenType.objects.all(), required=False, allow_null=True
    )
    formFactor = serializers.ChoiceField(source='form_factor', choices=Holding.FORM_FACTORS, required=False, allow_blank=True)
    weightOz = serializers.DecimalField(
        source='weight_oz', max_digits=12, decimal_places=4, required=False, allow_null=True
    )
    purchaseDate = serializers.DateField(source='purchase_date', required=False, allow_null=True)
    purchasePrice = serializers.DecimalField(
        source='purchase_price', max_digits=14, decimal_places=2, required=False, allow_null=True
    )
    purchasePricePerOz = serializers.DecimalField(
        source='purchase_price_per_oz', max_digits=14, decimal_places=2, required=False, allow_null=True
    )
    dealerId = serializers.PrimaryKeyRelatedField(
        source='dealer', queryset=Dealer.objects.all(), required=False, allow_null=True
    )
    dealer = serializers.CharField(source='dealer.name', read_only=True, default='')
    invoiceNumber = serializers.CharField(source='invoice_number', required=False, allow_blank=True)
    serialNumber = serializers.CharField(source='serial_number', required=False, allow_blank=True)
    gradingService = serializers.CharField(source='grading_service', required=False, allow_blank=True)
    certificateNumber = serializers.CharField(
        source='certificate_number', required=False, allow_blank=True
    )
    vaultLocation = serializers.CharField(source='vault_location', required=False, allow_blank=True)
    storageType = serializers.ChoiceField(
        source='storage_type', choices=Holding.STORAGE_TYPES, required=False, allow_blank=True
    )
    storageNotes = serializers.CharField(source='storage_notes', required=False, allow_blank=True)
    insuranceValue = serializers.DecimalField(
        source='insurance_value', max_digits=14, decimal_places=2, required=False, allow_null=True
    )
    publicAddress = serializers.CharField(source='public_address', required=False, allow_blank=True)
    cryptoSymbol = serializers.CharField(source='crypto_symbol', required=False, allow_blank=True)
    cryptoQuantity = serializers.DecimalField(
        source='crypto_quantity', max_digits=24, decimal_places=8, required=False, allow_null=True
    )
    walletType = serializers.ChoiceField(
        source='wallet_type', choices=Holding.WALLET_TYPES, required=False, allow_blank=True
    )
    walletLocation = serializers.CharField(source='wallet_location', required=False, allow_blank=True)
    seedPhrase = serializers.CharField(write_only=True, required=False, allow_blank=True)
    hasSeedPhrase = serializers.SerializerMethodField()
    reportedValue = serializers.DecimalField(
        source='reported_value', max_digits=16, decimal_places=2, required=False, allow_null=True
    )
    valueGainAlertPct = serializers.DecimalField(
        source='value_gain_alert_pct', max_digits=6, decimal_places=2, required=False, allow_null=True,
    )
    valueLossAlertPct = serializers.DecimalField(
        source='value_loss_alert_pct', max_digits=6, decimal_places=2, required=False, allow_null=True,
    )
    status = serializers.ChoiceField(choices=Holding.STATUSES, default='active')
    archivedAt = serializers.DateTimeField(source='archived_at', read_only=True)
    transactionType = serializers.ChoiceField(
        source='transaction_type', choices=Holding.TRANSACTION_TYPES, required=False, allow_blank=True
    )
    transactionDate = serializers.DateField(source='transaction_date', required=False, allow_null=True)
    salePrice = serializers.DecimalField(
        source='sale_price', max_digits=14, decimal_places=2, required=False, allow_null=True
    )
    buyerName = serializers.CharField(source='buyer_name', required=False, allow_blank=True)
    insuranceClaimNumber = serializers.CharField(
        source='insurance_claim_number', required=False, allow_blank=True
    )
    transactionNotes = serializers.CharField(source='transaction_notes', required=False, allow_blank=True)
    qrCode = serializers.CharField(source='qr_code', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    photos = PhotoSerializer(many=True, read_only=True)
    documents = DocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Holding
        fields = [
            'id', 'name', 'subName', 'vaultId', 'assetClass', 'assetCategoryId', 'productTypeId',
            'metalType', 'cryptoTokenTypeId', 'formFactor', 'weightOz', 'purity', 'quantity',
            'purchaseDate', 'purchasePrice', 'purchasePricePerOz', 'dealerId', 'dealer', 'invoiceNumber',
            'serialNumber', 'mint', 'year', 'country', 'condition', 'gradingService', 'grade',
            'certificateNumber', 'vaultLocation', 'storageType', 'storageNotes', 'insured', 'insuranceValue',
            'publicAddress', 'cryptoSymbol', 'cryptoQuantity', 'walletType', 'walletLocation',
            'seedPhrase', 'hasSeedPhrase', 'reportedValue',
            'valueGainAlertPct', 'valueLossAlertPct',
            'status', 'archivedAt', 'transactionType', 'transactionDate', 'salePrice',
            'buyerName', 'insuranceClaimNumber', 'transactionNotes',
            'notes', 'tags', 'qrCode', 'photos', 'documents', 'createdAt', 'updatedAt',
        ]
        read_only_fields = [
            'id', 'qrCode', 'hasSeedPhrase', 'archivedAt', 'createdAt', 'updatedAt',
            'transactionType', 'transactionDate', 'salePrice', 'buyerName',
            'insuranceClaimNumber', 'transactionNotes', 'status',
        ]

    def get_hasSeedPhrase(self, obj):
        return bool(obj.encrypted_seed_phrase)

    def _apply_derived_fields(self, validated_data):
        product_type = validated_data.get('product_type')
        if product_type:
            if product_type.category_id:
                validated_data['asset_category'] = product_type.category
            if product_type.metal_type_id:
                validated_data['metal_type'] = product_type.metal_type.slug
            if product_type.form_factor_id:
                validated_data['form_factor'] = product_type.form_factor.slug
            if product_type.standard_weight_oz is not None and validated_data.get('weight_oz') is None:
                validated_data['weight_oz'] = product_type.standard_weight_oz
            if product_type.standard_purity is not None and validated_data.get('purity') is None:
                validated_data['purity'] = product_type.standard_purity
            if product_type.mint and not validated_data.get('mint'):
                validated_data['mint'] = product_type.mint
            if product_type.country and not validated_data.get('country'):
                validated_data['country'] = product_type.country
        crypto_token = validated_data.get('crypto_token')
        if crypto_token:
            validated_data['crypto_symbol'] = crypto_token.symbol
        asset_class = validated_data.get('asset_class')
        if asset_class == 'crypto':
            validated_data.setdefault('form_factor', '')
            validated_data.setdefault('metal_type', '')
        if not validated_data.get('name'):
            if product_type:
                validated_data['name'] = product_type.name
            elif crypto_token:
                validated_data['name'] = crypto_token.name
            else:
                validated_data['name'] = validated_data.get('sub_name') or 'Unnamed Holding'
        return validated_data

    def validate(self, attrs):
        asset_class = attrs.get('asset_class', getattr(self.instance, 'asset_class', 'bullion'))
        if asset_class == 'bullion':
            if attrs.get('weight_oz') is None and (not self.instance or self.instance.weight_oz is None):
                raise serializers.ValidationError({'weightOz': 'Weight is required for bullion holdings.'})
            if attrs.get('purchase_date') is None and (not self.instance or not self.instance.purchase_date):
                raise serializers.ValidationError({'purchaseDate': 'Purchase date is required for bullion.'})
            if attrs.get('purchase_price') is None and (not self.instance or self.instance.purchase_price is None):
                raise serializers.ValidationError({'purchasePrice': 'Purchase price is required for bullion.'})
        if asset_class == 'crypto' and not attrs.get('crypto_token') and not (
            self.instance and self.instance.crypto_token_id
        ):
            raise serializers.ValidationError({'cryptoTokenTypeId': 'Token type is required for crypto holdings.'})
        return attrs

    def create(self, validated_data):
        seed = validated_data.pop('seedPhrase', None)
        if seed:
            validated_data['encrypted_seed_phrase'] = encrypt_value(seed)
        validated_data = self._apply_derived_fields(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        seed = validated_data.pop('seedPhrase', None)
        if seed:
            validated_data['encrypted_seed_phrase'] = encrypt_value(seed)
        validated_data = self._apply_derived_fields(validated_data)
        return super().update(instance, validated_data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['vaultId'] = str(instance.vault_id)
        data['assetCategoryId'] = str(instance.asset_category_id) if instance.asset_category_id else None
        data['productTypeId'] = str(instance.product_type_id) if instance.product_type_id else None
        data['cryptoTokenTypeId'] = str(instance.crypto_token_id) if instance.crypto_token_id else None
        data['dealerId'] = str(instance.dealer_id) if instance.dealer_id else None
        data['dealer'] = instance.dealer.name if instance.dealer_id else ''
        data['weightOz'] = _decimal(instance.weight_oz)
        data['purity'] = _decimal(instance.purity)
        data['purchasePrice'] = _decimal(instance.purchase_price)
        data['purchasePricePerOz'] = _decimal(instance.purchase_price_per_oz)
        data['insuranceValue'] = _decimal(instance.insurance_value)
        data['cryptoQuantity'] = _decimal(instance.crypto_quantity)
        data['reportedValue'] = _decimal(instance.reported_value)
        data['valueGainAlertPct'] = _decimal(instance.value_gain_alert_pct)
        data['valueLossAlertPct'] = _decimal(instance.value_loss_alert_pct)
        data['salePrice'] = _decimal(instance.sale_price)
        data['archivedAt'] = instance.archived_at.isoformat() if instance.archived_at else None
        return data


class HoldingTransactSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=['sold', 'stolen', 'deleted'])
    transactionDate = serializers.DateField(required=False, allow_null=True)
    salePrice = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, allow_null=True)
    buyerName = serializers.CharField(required=False, allow_blank=True, default='')
    insuranceClaimNumber = serializers.CharField(required=False, allow_blank=True, default='')
    transactionNotes = serializers.CharField(required=False, allow_blank=True, default='')
    performedBy = serializers.CharField(required=False, allow_blank=True, default='')


class ChangeLogSerializer(serializers.ModelSerializer):
    entityType = serializers.CharField(source='entity_type')
    entityId = serializers.CharField(source='entity_id')
    entityLabel = serializers.CharField(source='entity_label')
    performedBy = serializers.CharField(source='performed_by')
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = ChangeLog
        fields = [
            'id', 'entityType', 'entityId', 'entityLabel', 'action',
            'performedBy', 'changes', 'notes', 'createdAt',
        ]
        read_only_fields = fields


class AuditLineItemSerializer(serializers.ModelSerializer):
    lineKind = serializers.CharField(source='line_kind', read_only=True)
    holdingId = serializers.SerializerMethodField()
    holdingName = serializers.SerializerMethodField()
    productTypeId = serializers.SerializerMethodField()
    holdingQrCode = serializers.SerializerMethodField()
    holdingSerial = serializers.SerializerMethodField()
    expectedQty = serializers.IntegerField(source='expected_qty')
    currentCount = serializers.IntegerField(source='current_count', required=False, allow_null=True)
    countedQty = serializers.IntegerField(source='counted_qty', required=False, allow_null=True)
    discrepancyNotes = serializers.CharField(source='discrepancy_notes', required=False, allow_blank=True)

    class Meta:
        model = AuditLineItem
        fields = [
            'id', 'lineKind', 'holdingId', 'holdingName', 'productTypeId',
            'holdingQrCode', 'holdingSerial', 'expectedQty', 'currentCount', 'countedQty',
            'verified', 'discrepancyNotes',
        ]
        read_only_fields = fields

    def get_holdingId(self, instance):
        return str(instance.holding_id) if instance.holding_id else None

    def get_holdingName(self, instance):
        return instance.display_name or (instance.holding.name if instance.holding_id else '')

    def get_productTypeId(self, instance):
        return str(instance.product_type_id) if instance.product_type_id else None

    def get_holdingQrCode(self, instance):
        return instance.holding.qr_code if instance.holding_id else None

    def get_holdingSerial(self, instance):
        return instance.holding.serial_number if instance.holding_id else None


class AuditSessionSerializer(serializers.ModelSerializer):
    vaultId = serializers.PrimaryKeyRelatedField(source='vault', queryset=Vault.objects.all())
    vaultName = serializers.CharField(source='vault.name', read_only=True)
    auditType = serializers.ChoiceField(source='audit_type', choices=AuditSession.AUDIT_TYPES, default='standard')
    performedBy = serializers.CharField(source='performed_by', required=False, allow_blank=True)
    discrepancyCount = serializers.IntegerField(source='discrepancy_count', read_only=True)
    startedAt = serializers.DateTimeField(source='started_at', read_only=True)
    completedAt = serializers.DateTimeField(source='completed_at', read_only=True)
    lineItems = AuditLineItemSerializer(many=True, read_only=True, source='line_items')

    class Meta:
        model = AuditSession
        fields = [
            'id', 'vaultId', 'vaultName', 'auditType', 'status', 'performedBy', 'notes',
            'discrepancyCount', 'startedAt', 'completedAt', 'lineItems',
        ]
        read_only_fields = ['id', 'vaultName', 'discrepancyCount', 'startedAt', 'completedAt', 'lineItems']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['vaultId'] = str(instance.vault_id)
        return data


class AuditReportSerializer(serializers.ModelSerializer):
    auditId = serializers.UUIDField(source='audit_id', read_only=True)
    vaultName = serializers.CharField(source='audit.vault.name', read_only=True)
    reportData = serializers.JSONField(source='report_data')
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = AuditReport
        fields = ['id', 'auditId', 'vaultName', 'reportData', 'createdAt']
        read_only_fields = fields


class SecretAttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    attachmentType = serializers.ChoiceField(
        source='attachment_type', choices=SecretAttachment.ATTACHMENT_TYPES, default='document'
    )
    uploadedAt = serializers.DateTimeField(source='uploaded_at', read_only=True)

    class Meta:
        model = SecretAttachment
        fields = ['id', 'url', 'filename', 'attachmentType', 'uploadedAt']
        read_only_fields = ['id', 'uploadedAt', 'filename']

    def get_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        if obj.file:
            return obj.file.url
        return None


class SecretSerializer(serializers.ModelSerializer):
    vaultId = serializers.PrimaryKeyRelatedField(
        source='vault', queryset=Vault.objects.all(), required=False, allow_null=True
    )
    siteId = serializers.PrimaryKeyRelatedField(
        source='site', queryset=Site.objects.all(), required=False, allow_null=True
    )
    secretType = serializers.ChoiceField(source='secret_type', choices=Secret.SECRET_TYPES, default='other')
    content = serializers.CharField(write_only=True, required=False, allow_blank=True)
    hasContent = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    attachments = SecretAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Secret
        fields = [
            'id', 'label', 'secretType', 'vaultId', 'siteId', 'content', 'hasContent',
            'notes', 'tags', 'attachments', 'createdAt', 'updatedAt',
        ]
        read_only_fields = ['id', 'hasContent', 'attachments', 'createdAt', 'updatedAt']

    def get_hasContent(self, obj):
        return bool(obj.encrypted_content)

    def create(self, validated_data):
        content = validated_data.pop('content', None)
        if content:
            validated_data['encrypted_content'] = encrypt_value(content)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        content = validated_data.pop('content', None)
        if content:
            validated_data['encrypted_content'] = encrypt_value(content)
        return super().update(instance, validated_data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['vaultId'] = str(instance.vault_id) if instance.vault_id else None
        data['siteId'] = str(instance.site_id) if instance.site_id else None
        return data


class PortfolioSnapshotSerializer(serializers.ModelSerializer):
    totalValue = serializers.DecimalField(source='total_value', max_digits=16, decimal_places=2)
    totalCost = serializers.DecimalField(source='total_cost', max_digits=16, decimal_places=2)
    goldOz = serializers.DecimalField(source='gold_oz', max_digits=14, decimal_places=4)
    silverOz = serializers.DecimalField(source='silver_oz', max_digits=14, decimal_places=4)
    platinumOz = serializers.DecimalField(source='platinum_oz', max_digits=14, decimal_places=4)
    palladiumOz = serializers.DecimalField(source='palladium_oz', max_digits=14, decimal_places=4)

    class Meta:
        model = PortfolioSnapshot
        fields = [
            'date', 'totalValue', 'totalCost', 'goldOz', 'silverOz', 'platinumOz', 'palladiumOz',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        for key in ('totalValue', 'totalCost', 'goldOz', 'silverOz', 'platinumOz', 'palladiumOz'):
            data[key] = _decimal(getattr(instance, {
                'totalValue': 'total_value',
                'totalCost': 'total_cost',
                'goldOz': 'gold_oz',
                'silverOz': 'silver_oz',
                'platinumOz': 'platinum_oz',
                'palladiumOz': 'palladium_oz',
            }[key]))
        return data