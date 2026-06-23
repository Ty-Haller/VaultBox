import uuid
from datetime import date
from decimal import Decimal

from django.core.management.base import BaseCommand

from administration.models import Dealer
from inventory.models import Holding, PortfolioSnapshot, Site, Vault

SITE_IDS = {
    'primary': uuid.UUID('00000000-0000-4000-8000-000000000001'),
    'bank': uuid.UUID('00000000-0000-4000-8000-000000000002'),
    'depository': uuid.UUID('00000000-0000-4000-8000-000000000003'),
}

VAULT_IDS = {
    'liberty': uuid.UUID('00000000-0000-4000-8000-000000000011'),
    'cache': uuid.UUID('00000000-0000-4000-8000-000000000012'),
    'sdb': uuid.UUID('00000000-0000-4000-8000-000000000013'),
    'allocated': uuid.UUID('00000000-0000-4000-8000-000000000014'),
    'secondary': uuid.UUID('00000000-0000-4000-8000-000000000015'),
}


class Command(BaseCommand):
    help = 'Seed VaultBox with demo bullion inventory data'

    def add_arguments(self, parser):
        parser.add_argument('--flush', action='store_true', help='Delete existing data first')

    def _dealer(self, name: str) -> Dealer | None:
        if not name:
            return None
        dealer, _ = Dealer.objects.get_or_create(name=name, defaults={'slug': name.lower().replace(' ', '-')[:50]})
        return dealer

    def handle(self, *args, **options):
        if options['flush']:
            Holding.objects.all().delete()
            Vault.objects.all().delete()
            Site.objects.all().delete()
            PortfolioSnapshot.objects.all().delete()
            self.stdout.write('Flushed existing data')

        if Site.objects.exists():
            self.stdout.write('Data already exists, skipping seed (use --flush to replace)')
            return

        sites = [
            Site(
                id=SITE_IDS['primary'], name='Primary Residence', slug='primary-residence',
                description='Main home location with basement safe room',
                address='1247 Oakwood Lane', city='Denver', state='CO', country='USA',
                postal_code='80202', latitude=Decimal('39.7392'), longitude=Decimal('-104.9903'),
                contact_name='John Vaultkeeper', contact_phone='+1-303-555-0142',
                notes='Fire-rated safe room, monitored alarm system',
                tags=['primary', 'residential'],
            ),
            Site(
                id=SITE_IDS['bank'], name='First National Bank — Downtown',
                slug='first-national-downtown',
                description='Safe deposit box at downtown branch',
                address='500 17th Street', city='Denver', state='CO', country='USA',
                postal_code='80202', contact_name='Branch Manager',
                contact_phone='+1-303-555-0199',
                notes='Box #447, dual-key access, annual fee $185',
                tags=['bank', 'off-site'],
            ),
            Site(
                id=SITE_IDS['depository'], name='Delaware Depository',
                slug='delaware-depository',
                description='Third-party allocated storage for bulk holdings',
                address='3601 North Market Street', city='Wilmington', state='DE',
                country='USA', postal_code='19802',
                notes='Allocated storage, Lloyds insured, quarterly audits',
                tags=['depository', 'allocated', 'insured'],
            ),
        ]
        Site.objects.bulk_create(sites)

        vaults = [
            Vault(
                id=VAULT_IDS['liberty'], name='Liberty 50 Gun Safe', slug='liberty-50-gun-safe',
                site_id=SITE_IDS['primary'], type='home-safe',
                description='Primary home safe for high-value coins and bars',
                manufacturer='Liberty Safe', model='Presidential 50',
                serial_number='LIB-50-8847291', capacity_oz=Decimal('500'),
                security_level=4, install_date=date(2023, 2, 1), last_audit_date=date(2025, 10, 15),
                fire_rating='75 min @ 1200°F', weight_capacity_lbs=Decimal('1250'),
                notes='Bolted to concrete floor, biometric + key combo lock',
                tags=['primary', 'fire-rated'],
            ),
            Vault(
                id=VAULT_IDS['cache'], name='Hidden Floor Cache', slug='hidden-floor-cache',
                site_id=SITE_IDS['primary'], type='cache',
                description='Concealed floor compartment for emergency reserves',
                capacity_oz=Decimal('50'), security_level=2,
                install_date=date(2023, 5, 20), last_audit_date=date(2025, 6, 1),
                notes='Location known only to primary owner', tags=['cache', 'emergency'],
            ),
            Vault(
                id=VAULT_IDS['sdb'], name='Safe Deposit Box #447', slug='sdb-447',
                site_id=SITE_IDS['bank'], type='bank-deposit',
                description='3×10 bank safe deposit box', serial_number='FNB-SDB-447',
                capacity_oz=Decimal('30'), security_level=5,
                install_date=date(2022, 6, 15), last_audit_date=date(2025, 8, 20),
                notes='Holds graded coins and certificates', tags=['bank', 'graded'],
            ),
            Vault(
                id=VAULT_IDS['allocated'], name='Allocated Vault A-12', slug='allocated-vault-a12',
                site_id=SITE_IDS['depository'], type='depository',
                description='Allocated segregated storage at Delaware Depository',
                serial_number='DD-A12-2024', capacity_oz=Decimal('2000'),
                security_level=5, install_date=date(2024, 3, 15),
                last_audit_date=date(2025, 12, 1), fire_rating='UL Class 350',
                notes='Segregated, serialized bars with full chain of custody',
                tags=['allocated', 'insured', 'bulk'],
            ),
            Vault(
                id=VAULT_IDS['secondary'], name='Secondary Home Safe', slug='secondary-home-safe',
                site_id=SITE_IDS['primary'], type='home-safe',
                description='Smaller fire safe for fractional silver',
                manufacturer='SentrySafe', model='EF4738E',
                serial_number='SEN-EF4738-22910', capacity_oz=Decimal('100'),
                security_level=3, install_date=date(2024, 1, 10),
                last_audit_date=date(2025, 11, 1), fire_rating='60 min @ 1700°F',
                notes='Closet-mounted, electronic lock', tags=['silver', 'fractional'],
            ),
        ]
        Vault.objects.bulk_create(vaults)

        holdings_data = [
            ('1 oz American Gold Eagle', VAULT_IDS['liberty'], 'gold', 'coin', '1.0', '0.9167', 10,
             '2023-03-15', '2050', '2050', 'APMEX', 'APM-2023-88421', None, 'US Mint', 2023, 'USA',
             'bu', None, None, None, 'Shelf A, Tray 1', True, '24000',
             'Tube of 10, original mint packaging', ['eagle', 'us-mint', 'tube']),
            ('10 oz PAMP Suisse Gold Bar', VAULT_IDS['liberty'], 'gold', 'bar', '10.0', '0.9999', 3,
             '2024-01-20', '20500', '2050', 'JM Bullion', None, 'PAMP-10-A8847', 'PAMP Suisse', 2024,
             'Switzerland', 'mint', None, None, 'CERT-PAMP-8847291', 'Shelf A, Tray 2', True, '72000',
             'Veriscan® authenticated, assay cards included', ['pamp', 'bar', 'serialized']),
            ('1 oz Canadian Maple Leaf Gold', VAULT_IDS['sdb'], 'gold', 'coin', '1.0', '0.9999', 5,
             '2022-08-10', '9200', '1840', 'Local Coin Shop', None, None, 'Royal Canadian Mint', 2022,
             'Canada', 'bu', 'NGC', 'MS70', 'NGC-4829103', 'SDB Tray', True, None,
             'All 5 graded MS70', ['maple', 'graded', 'ngc']),
            ('100 oz Royal Canadian Mint Silver Bar', VAULT_IDS['allocated'], 'silver', 'bar',
             '100.0', '0.9999', 5, '2024-04-01', '12500', '25.0', 'SD Bullion', 'SD-2024-112847',
             'RCM-100-884729', 'Royal Canadian Mint', 2024, 'Canada', 'mint', None, None, None,
             'Vault A-12, Rack 3', True, '15000',
             'Allocated storage, quarterly statements', ['rcm', 'bulk', 'allocated']),
            ('1 oz American Silver Eagle', VAULT_IDS['secondary'], 'silver', 'coin', '1.0', '0.999', 200,
             '2023-06-01', '5200', '26.0', 'APMEX', None, None, 'US Mint', 2023, 'USA', 'bu',
             None, None, None, 'Tube Rack, Slots 1-4', False, None,
             '4 tubes of 50, Type 2 design', ['eagle', 'silver', 'tube', 'stacking']),
            ('10 oz Silver Bar — Generic', VAULT_IDS['secondary'], 'silver', 'bar', '10.0', '0.999', 20,
             '2024-02-14', '4800', '24.0', 'SD Bullion', None, None, None, None, None, 'raw',
             None, None, None, 'Tube Rack, Slot 5', False, None,
             'Secondary market bars, various mints', ['generic', 'stacking']),
            ('1 oz Gold Maple Leaf', VAULT_IDS['cache'], 'gold', 'coin', '1.0', '0.9999', 2,
             '2023-05-25', '3900', '1950', 'Private Sale', None, None, 'Royal Canadian Mint', 2021,
             'Canada', 'bu', None, None, None, 'Compartment 1', False, None,
             'Emergency cache — not on primary inventory audit', ['cache', 'emergency']),
            ('1 oz Platinum American Eagle', VAULT_IDS['liberty'], 'platinum', 'coin', '1.0', '0.9995', 4,
             '2024-06-10', '3600', '900', 'JM Bullion', None, None, 'US Mint', 2024, 'USA', 'bu',
             None, None, None, 'Shelf B, Tray 1', True, None,
             'Diversification play into platinum', ['platinum', 'eagle']),
            ('1 oz Palladium Canadian Maple Leaf', VAULT_IDS['sdb'], 'palladium', 'coin', '1.0',
             '0.9995', 3, '2024-09-05', '3150', '1050', 'APMEX', None, None,
             'Royal Canadian Mint', 2024, 'Canada', 'bu', None, None, None, 'SDB Tray', True, None,
             'Rare palladium exposure', ['palladium', 'maple']),
            ('1 kg Gold Cast Bar', VAULT_IDS['allocated'], 'gold', 'bar', '32.1507', '0.9999', 1,
             '2024-11-01', '68000', '2115', 'Delaware Depository Direct', None, 'DD-KG-2024-00142',
             'PAMP Suisse', 2024, 'Switzerland', 'mint', None, None, 'DD-COC-00142',
             'Vault A-12, Secure Cage', True, '78000',
             'Kilo bar, full chain of custody documentation', ['kilo', 'pamp', 'allocated', 'bulk']),
        ]

        for row in holdings_data:
            Holding.objects.create(
                name=row[0], vault_id=row[1], metal_type=row[2], form_factor=row[3],
                weight_oz=Decimal(row[4]), purity=Decimal(row[5]), quantity=row[6],
                purchase_date=date.fromisoformat(row[7]),
                purchase_price=Decimal(row[8]), purchase_price_per_oz=Decimal(row[9]),
                dealer=self._dealer(row[10]), invoice_number=row[11] or '', serial_number=row[12] or '',
                mint=row[13] or '', year=row[14], country=row[15] or '',
                condition=row[16], grading_service=row[17] or '', grade=row[18] or '',
                certificate_number=row[19] or '', vault_location=row[20] or '',
                insured=row[21], insurance_value=Decimal(row[22]) if row[22] else None,
                notes=row[23], tags=row[24],
            )

        history = [
            ('2025-01-01', 142500, 128000, 48.2, 420, 4, 3),
            ('2025-02-01', 148200, 128000, 48.2, 420, 4, 3),
            ('2025-03-01', 155800, 128000, 48.2, 420, 4, 3),
            ('2025-04-01', 162400, 131500, 80.3, 920, 4, 3),
            ('2025-05-01', 158900, 131500, 80.3, 920, 4, 3),
            ('2025-06-01', 171200, 131500, 80.3, 920, 4, 3),
            ('2025-07-01', 178600, 135650, 80.3, 920, 4, 3),
            ('2025-08-01', 182100, 135650, 80.3, 920, 4, 3),
            ('2025-09-01', 188400, 138800, 80.3, 920, 4, 3),
            ('2025-10-01', 195700, 138800, 80.3, 920, 4, 3),
            ('2025-11-01', 201300, 138800, 80.3, 920, 4, 3),
            ('2025-12-01', 208900, 142050, 112.5, 1420, 4, 3),
        ]
        PortfolioSnapshot.objects.bulk_create([
            PortfolioSnapshot(
                date=date.fromisoformat(d), total_value=Decimal(str(tv)),
                total_cost=Decimal(str(tc)), gold_oz=Decimal(str(go)),
                silver_oz=Decimal(str(so)), platinum_oz=Decimal(str(po)),
                palladium_oz=Decimal(str(pd)),
            )
            for d, tv, tc, go, so, po, pd in history
        ])

        self.stdout.write(self.style.SUCCESS(
            f'Seeded {Site.objects.count()} sites, {Vault.objects.count()} vaults, '
            f'{Holding.objects.count()} holdings'
        ))