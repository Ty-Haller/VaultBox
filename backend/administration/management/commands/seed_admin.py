from decimal import Decimal

from django.contrib.auth.models import Group, Permission, User
from django.core.management.base import BaseCommand

from administration.models import (
    AppSetting,
    AssetCategory,
    AuditWorkflow,
    CryptoTokenType,
    Currency,
    Dealer,
    FormFactorType,
    MetalType,
    NotificationOption,
    ProductType,
    SiteType,
    UserProfile,
    VaultType,
)


class Command(BaseCommand):
    help = 'Seed administration config models with defaults'

    def handle(self, *args, **options):
        if SiteType.objects.exists():
            self.stdout.write('Admin config already seeded')
            self._seed_dealers()
            self._seed_crypto_tokens()
            self._seed_taxonomy()
            self._seed_ticker_config()
            return

        site_types = [
            ('Residential', 'residential', 'Home or personal residence', '#5a7a96'),
            ('Commercial Bank', 'commercial-bank', 'Bank safe deposit branch', '#3d556d'),
            ('Depository', 'depository', 'Third-party allocated storage', '#8e9aaf'),
            ('Private Vault Facility', 'private-vault-facility', 'Commercial vault service', '#d4a017'),
        ]
        for i, (name, slug, desc, color) in enumerate(site_types):
            SiteType.objects.create(name=name, slug=slug, description=desc, color=color, sort_order=i)

        vault_types = [
            ('Home Safe', 'home-safe', 'Residential fire-rated safe', 4),
            ('Bank Deposit Box', 'bank-deposit', 'Institutional safe deposit', 5),
            ('Private Vault', 'private-vault', 'Third-party vault storage', 5),
            ('Cache / Hide', 'cache', 'Concealed emergency storage', 2),
            ('Depository', 'depository', 'Allocated bullion depository', 5),
        ]
        for i, (name, slug, desc, sec) in enumerate(vault_types):
            VaultType.objects.create(name=name, slug=slug, description=desc, default_security_level=sec, sort_order=i)

        metal_types = [
            ('Gold', 'gold', '#d4a017', 'XAU'),
            ('Silver', 'silver', '#a8b0b8', 'XAG'),
            ('Platinum', 'platinum', '#8e9aaf', 'XPT'),
            ('Palladium', 'palladium', '#9aa5b1', 'XPD'),
        ]
        for i, (name, slug, color, sym) in enumerate(metal_types):
            MetalType.objects.create(name=name, slug=slug, color=color, api_symbol=sym, sort_order=i)

        form_factors = [
            ('Bar', 'bar', 'bar'),
            ('Coin', 'coin', 'coin'),
            ('Round', 'round', 'round'),
            ('Grain / Shot', 'grain', 'grain'),
            ('Ingot', 'ingot', 'bar'),
            ('Jewelry', 'jewelry', 'other'),
            ('Other', 'other', 'other'),
        ]
        for i, (name, slug, cat) in enumerate(form_factors):
            FormFactorType.objects.create(name=name, slug=slug, category=cat, sort_order=i)

        currencies = [
            ('USD', 'US Dollar', '$', True, '1'),
            ('EUR', 'Euro', '€', False, '0.92'),
            ('GBP', 'British Pound', '£', False, '0.79'),
            ('CAD', 'Canadian Dollar', 'C$', False, '1.36'),
        ]
        for code, name, sym, default, rate in currencies:
            Currency.objects.create(code=code, name=name, symbol=sym, is_default=default, exchange_rate_to_usd=Decimal(rate))

        settings = [
            ('default_currency', 'USD', 'string', 'general', 'Default display currency'),
            ('price_refresh_interval', '60', 'number', 'integration', 'Spot price refresh interval (seconds)'),
            ('enable_qr_labels', 'true', 'boolean', 'general', 'Enable QR label generation'),
            ('portfolio_base_currency', 'USD', 'string', 'display', 'Portfolio valuation currency'),
            ('api_rate_limit', '100', 'number', 'integration', 'Max API requests per minute'),
        ]
        for key, val, vtype, cat, desc in settings:
            AppSetting.objects.create(key=key, value=val, value_type=vtype, category=cat, description=desc)

        notifications = [
            ('Price Change Alert', 'price-change', 'price_change', True, 1.0, False, True),
            ('Audit Due Reminder', 'audit-due', 'audit_due', True, None, True, True),
            ('Audit Overdue', 'audit-overdue', 'audit_overdue', True, None, True, True),
            ('Vault Capacity Warning', 'capacity-warning', 'capacity_warning', True, 85.0, False, True),
            ('New Acquisition', 'new-acquisition', 'new_acquisition', True, None, False, True),
        ]
        for name, slug, etype, en, thresh, email, inapp in notifications:
            NotificationOption.objects.create(
                name=name, slug=slug, event_type=etype, enabled=en,
                threshold=Decimal(str(thresh)) if thresh else None,
                email_notify=email, in_app_notify=inapp,
            )

        workflows = [
            ('Quarterly Vault Audit', 'quarterly-vault-audit', 'vault', 90, 14),
            ('Annual Site Review', 'annual-site-review', 'site', 365, 30),
            ('Holding Verification', 'holding-verification', 'holding', 180, 7),
        ]
        for name, slug, applies, interval, reminder in workflows:
            AuditWorkflow.objects.create(
                name=name, slug=slug, applies_to=applies,
                interval_days=interval, reminder_days_before=reminder,
                audit_type='standard',
            )

        admin_group, _ = Group.objects.get_or_create(name='Administrators')
        viewer_group, _ = Group.objects.get_or_create(name='Viewers')
        editor_group, _ = Group.objects.get_or_create(name='Editors')

        perms = Permission.objects.filter(codename__in=[
            'add_site', 'change_site', 'delete_site', 'view_site',
            'add_vault', 'change_vault', 'delete_vault',
            'add_holding', 'change_holding', 'delete_holding',
        ])
        editor_group.permissions.set(perms)
        admin_group.permissions.set(Permission.objects.all()[:50])

        if not User.objects.filter(username='admin').exists():
            admin_user = User.objects.create_superuser('admin', 'admin@vaultbox.local', 'admin')
            admin_user.set_unusable_password()
            admin_user.save(update_fields=['password'])
            UserProfile.objects.create(user=admin_user, display_name='Administrator', is_admin=True)
            admin_user.groups.add(admin_group)
            from accounts.models import UserGlobalRole, VaultBoxRole
            UserGlobalRole.objects.get_or_create(user=admin_user, defaults={'role': VaultBoxRole.FULL_ADMIN})

        self.stdout.write(self.style.SUCCESS('Administration config seeded'))
        self._seed_dealers()
        self._seed_crypto_tokens()
        self._seed_taxonomy()
        self._seed_ticker_config()

    def _seed_crypto_tokens(self):
        tokens = [
            ('Bitcoin', 'BTC', 'bitcoin', 'bitcoin'),
            ('Ethereum', 'ETH', 'ethereum', 'ethereum'),
            ('Dogecoin', 'DOGE', 'dogecoin', 'dogecoin'),
            ('Litecoin', 'LTC', 'litecoin', 'litecoin'),
            ('Solana', 'SOL', 'solana', 'solana'),
        ]
        for i, (name, symbol, slug, chain) in enumerate(tokens):
            CryptoTokenType.objects.get_or_create(
                slug=slug,
                defaults={
                    'name': name, 'symbol': symbol, 'chain': chain,
                    'coingecko_id': slug, 'sort_order': i,
                },
            )
        if not MetalType.objects.filter(slug='copper').exists():
            MetalType.objects.create(
                name='Copper', slug='copper', color='#b87333',
                api_symbol='XCU', sort_order=10,
            )

    def _seed_dealers(self):
        dealers = [
            ('APMEX', 'apmex', 'https://www.apmex.com'),
            ('JM Bullion', 'jm-bullion', 'https://www.jmbullion.com'),
            ('SD Bullion', 'sd-bullion', 'https://sdbullion.com'),
            ('Kitco', 'kitco', 'https://www.kitco.com'),
            ('Local Coin Shop', 'local-coin-shop', ''),
            ('Private Sale', 'private-sale', ''),
            ('Delaware Depository Direct', 'delaware-depository', 'https://www.delawaredepository.com'),
        ]
        for i, (name, slug, website) in enumerate(dealers):
            Dealer.objects.get_or_create(
                slug=slug,
                defaults={'name': name, 'website': website, 'sort_order': i},
            )

    def _seed_taxonomy(self):
        if AssetCategory.objects.exists():
            AssetCategory.objects.filter(slug='precious-metals').update(asset_class='bullion')
            AssetCategory.objects.filter(slug='cryptocurrency').update(asset_class='crypto')
            AssetCategory.objects.filter(slug='fiat-currency').update(asset_class='currency')
            AssetCategory.objects.filter(slug='gems-jewelry').update(asset_class='gem')
            AssetCategory.objects.filter(slug='watches').update(asset_class='watch')
            AssetCategory.objects.filter(slug='collectibles').update(asset_class='collectible')
            return

        # SD Bullion–style hierarchy
        top = {}
        for name, slug, color, order, asset_class in [
            ('Precious Metals', 'precious-metals', '#d4a017', 0, 'bullion'),
            ('Cryptocurrency', 'cryptocurrency', '#f7931a', 1, 'crypto'),
            ('Fiat Currency', 'fiat-currency', '#2e8b57', 2, 'currency'),
            ('Gems & Jewelry', 'gems-jewelry', '#9b59b6', 3, 'gem'),
            ('Watches', 'watches', '#34495e', 4, 'watch'),
            ('Collectibles', 'collectibles', '#e67e22', 5, 'collectible'),
        ]:
            top[slug] = AssetCategory.objects.create(
                name=name, slug=slug, color=color, sort_order=order,
                asset_class=asset_class,
                description=f'{name} assets',
            )

        bullion = AssetCategory.objects.create(
            name='Bullion', slug='bullion', parent=top['precious-metals'],
            color='#d4a017', sort_order=0,
        )
        silver_bullion = AssetCategory.objects.create(
            name='Silver Bullion', slug='silver-bullion', parent=bullion,
            color='#a8b0b8', sort_order=0,
        )
        gold_bullion = AssetCategory.objects.create(
            name='Gold Bullion', slug='gold-bullion', parent=bullion,
            color='#d4a017', sort_order=1,
        )
        silver_coins = AssetCategory.objects.create(
            name='Silver Coins', slug='silver-coins', parent=silver_bullion,
            color='#a8b0b8', sort_order=0,
        )
        gold_coins = AssetCategory.objects.create(
            name='Gold Coins', slug='gold-coins', parent=gold_bullion,
            color='#d4a017', sort_order=0,
        )

        metals = {m.slug: m for m in MetalType.objects.all()}
        forms = {f.slug: f for f in FormFactorType.objects.all()}

        products = [
            ('American Silver Eagle', 'american-silver-eagle', silver_coins, 'silver', 'coin',
             'US Mint', 'USA', '1 oz', Decimal('1'), Decimal('0.999')),
            ('Canadian Silver Maple Leaf', 'canadian-silver-maple', silver_coins, 'silver', 'coin',
             'Royal Canadian Mint', 'Canada', '1 oz', Decimal('1'), Decimal('0.9999')),
            ('American Gold Eagle', 'american-gold-eagle', gold_coins, 'gold', 'coin',
             'US Mint', 'USA', '1 oz', Decimal('1'), Decimal('0.9167')),
            ('American Gold Buffalo', 'american-gold-buffalo', gold_coins, 'gold', 'coin',
             'US Mint', 'USA', '1 oz', Decimal('1'), Decimal('0.9999')),
            ('Canadian Gold Maple Leaf', 'canadian-gold-maple', gold_coins, 'gold', 'coin',
             'Royal Canadian Mint', 'Canada', '1 oz', Decimal('1'), Decimal('0.9999')),
            ('10 oz Silver Bar', '10oz-silver-bar', silver_bullion, 'silver', 'bar',
             'Various', 'USA', '10 oz', Decimal('10'), Decimal('0.999')),
            ('1 oz Gold Bar', '1oz-gold-bar', gold_bullion, 'gold', 'bar',
             'Various', 'USA', '1 oz', Decimal('1'), Decimal('0.9999')),
        ]
        kitco_refs = {
            'american-silver-eagle': 'ASE-1OZ',
            'american-gold-buffalo': 'AGB-1OZ',
            'canadian-silver-maple': 'CSML-1OZ',
        }
        for i, (name, slug, cat, metal, form, mint, country, denom, weight, purity) in enumerate(products):
            ProductType.objects.create(
                name=name, slug=slug, category=cat,
                metal_type=metals.get(metal), form_factor=forms.get(form),
                mint=mint, country=country, denomination=denom,
                standard_weight_oz=weight, standard_purity=purity,
                kitco_product_ref=kitco_refs.get(slug, ''),
                sort_order=i,
            )

        if not AppSetting.objects.filter(key='kitco_price_source').exists():
            AppSetting.objects.create(
                key='kitco_price_source', value='kitco.com', value_type='string',
                category='integration',
                description='Kitco product reference for bullion spot cross-check',
            )

        self.stdout.write(self.style.SUCCESS('Asset taxonomy seeded'))

    def _seed_ticker_config(self):
        import json

        ticker_default = [
            {'type': 'metal', 'symbol': 'gold', 'label': 'Gold', 'enabled': True},
            {'type': 'metal', 'symbol': 'silver', 'label': 'Silver', 'enabled': True},
            {'type': 'metal', 'symbol': 'platinum', 'label': 'Platinum', 'enabled': True},
            {'type': 'metal', 'symbol': 'palladium', 'label': 'Palladium', 'enabled': True},
            {'type': 'crypto', 'symbol': 'BTC', 'label': 'Bitcoin', 'enabled': True},
            {'type': 'crypto', 'symbol': 'ETH', 'label': 'Ethereum', 'enabled': True},
            {'type': 'stock', 'symbol': 'GLD', 'label': 'GLD', 'enabled': True},
            {'type': 'stock', 'symbol': 'SPY', 'label': 'S&P 500', 'enabled': False},
            {'type': 'forex', 'symbol': 'EUR', 'label': 'EUR/USD', 'enabled': True},
        ]
        AppSetting.objects.update_or_create(
            key='price_ticker_config',
            defaults={
                'value': json.dumps(ticker_default),
                'value_type': 'json',
                'category': 'display',
                'description': 'Price ticker and Prices page — metals, crypto, stocks, forex',
            },
        )
        AppSetting.objects.update_or_create(
            key='ticker_scroll_mode',
            defaults={
                'value': 'auto',
                'value_type': 'string',
                'category': 'display',
                'description': 'Ticker display: auto (marquee) or scrollbar',
            },
        )