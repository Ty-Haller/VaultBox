"""Curated bullion catalog with Kitco-style references for search and auto-fill."""

from decimal import Decimal

# slug, name, metal, form, mint, country, weight oz, purity, kitco ref, category slug
CATALOG = [
    ('american-silver-eagle', 'American Silver Eagle 1 oz', 'silver', 'coin', 'US Mint', 'USA', '1', '0.999', 'ASE-1OZ', 'silver-coins'),
    ('canadian-silver-maple', 'Canadian Silver Maple Leaf 1 oz', 'silver', 'coin', 'Royal Canadian Mint', 'Canada', '1', '0.9999', 'CSML-1OZ', 'silver-coins'),
    ('american-gold-eagle', 'American Gold Eagle 1 oz', 'gold', 'coin', 'US Mint', 'USA', '1', '0.9167', 'AGE-1OZ', 'gold-coins'),
    ('american-gold-buffalo', 'American Gold Buffalo 1 oz', 'gold', 'coin', 'US Mint', 'USA', '1', '0.9999', 'AGB-1OZ', 'gold-coins'),
    ('canadian-gold-maple', 'Canadian Gold Maple Leaf 1 oz', 'gold', 'coin', 'Royal Canadian Mint', 'Canada', '1', '0.9999', 'CGML-1OZ', 'gold-coins'),
    ('10oz-silver-bar', '10 oz Silver Bar', 'silver', 'bar', 'Various', 'USA', '10', '0.999', 'SB-10OZ', 'silver-bullion'),
    ('1oz-gold-bar', '1 oz Gold Bar', 'gold', 'bar', 'Various', 'USA', '1', '0.9999', 'GB-1OZ', 'gold-bullion'),
    ('100oz-silver-bar', '100 oz Silver Bar', 'silver', 'bar', 'Royal Canadian Mint', 'Canada', '100', '0.9999', 'RCM-100OZ', 'silver-bullion'),
    ('1oz-platinum-eagle', '1 oz Platinum American Eagle', 'platinum', 'coin', 'US Mint', 'USA', '1', '0.9995', 'PAE-1OZ', 'gold-coins'),
    ('1oz-palladium-maple', '1 oz Palladium Canadian Maple Leaf', 'palladium', 'coin', 'Royal Canadian Mint', 'Canada', '1', '0.9995', 'CPML-1OZ', 'gold-coins'),
    ('1kg-gold-bar', '1 kg Gold Cast Bar', 'gold', 'bar', 'PAMP Suisse', 'Switzerland', '32.1507', '0.9999', 'PAMP-KG', 'gold-bullion'),
    ('10oz-gold-bar', '10 oz PAMP Suisse Gold Bar', 'gold', 'bar', 'PAMP Suisse', 'Switzerland', '10', '0.9999', 'PAMP-10OZ', 'gold-bullion'),
]


def _resolve_catalog_item(slug, name, metal, form, mint, country, weight, purity, kitco_ref, category_slug):
    """Match catalog row to DB product type and asset category when possible."""
    from administration.models import AssetCategory, ProductType

    product_type_id = None
    category_id = None

    pt = ProductType.objects.filter(slug=slug).select_related('category').first()
    if pt:
        product_type_id = str(pt.id)
        if pt.category_id:
            category_id = str(pt.category_id)
    if not category_id and category_slug:
        cat = AssetCategory.objects.filter(slug=category_slug).first()
        if cat:
            category_id = str(cat.id)

    return {
        'source': 'catalog',
        'slug': slug,
        'name': name,
        'metalSlug': metal,
        'formFactorSlug': form,
        'mint': mint,
        'country': country,
        'standardWeightOz': float(Decimal(weight)),
        'standardPurity': float(Decimal(purity)),
        'kitcoProductRef': kitco_ref,
        'productTypeId': product_type_id,
        'categoryId': category_id,
    }


def _matches(query: str, *fields: str) -> bool:
    q = query.lower()
    return any(q in (f or '').lower() for f in fields if f)


def search_catalog(query: str, limit: int = 20) -> list[dict]:
    if not query or len(query.strip()) < 2:
        return []
    q = query.strip()
    results = []
    for row in CATALOG:
        slug, name, metal, form, mint, country, weight, purity, kitco_ref, category_slug = row
        if not _matches(q, name, slug, kitco_ref, mint, metal):
            continue
        results.append(_resolve_catalog_item(slug, name, metal, form, mint, country, weight, purity, kitco_ref, category_slug))
        if len(results) >= limit:
            break
    return results


def search_product_types(queryset, query: str, limit: int = 20) -> list[dict]:
    q = query.strip().lower()
    results = []
    for pt in queryset:
        haystack = ' '.join(filter(None, [
            pt.name, pt.slug, pt.kitco_product_ref, pt.mint, pt.country, pt.denomination,
        ])).lower()
        if q not in haystack:
            continue
        metal_slug = pt.metal_type.slug if pt.metal_type_id else ''
        form_slug = pt.form_factor.slug if pt.form_factor_id else ''
        results.append({
            'source': 'product_type',
            'slug': pt.slug,
            'name': pt.name,
            'metalSlug': metal_slug,
            'formFactorSlug': form_slug,
            'mint': pt.mint,
            'country': pt.country,
            'standardWeightOz': float(pt.standard_weight_oz) if pt.standard_weight_oz else None,
            'standardPurity': float(pt.standard_purity) if pt.standard_purity else None,
            'kitcoProductRef': pt.kitco_product_ref,
            'productTypeId': str(pt.id),
            'categoryId': str(pt.category_id) if pt.category_id else None,
        })
        if len(results) >= limit:
            break
    return results