"""Build audit line items for standard (product-type totals) vs advanced (per holding)."""

from collections import defaultdict

from .models import AuditLineItem, AuditSession, Holding


def _holding_label(holding: Holding) -> str:
    if holding.product_type_id:
        return holding.product_type.name
    if holding.crypto_token_id:
        return holding.crypto_token.name
    return holding.name or 'Unnamed Holding'


def create_audit_line_items(audit: AuditSession, vault, audit_type: str) -> None:
    holdings = list(
        Holding.objects.filter(vault=vault, status='active')
        .select_related('product_type', 'crypto_token')
        .order_by('name')
    )

    if audit_type == 'advanced':
        for holding in holdings:
            AuditLineItem.objects.create(
                audit=audit,
                line_kind='holding',
                group_key=f'holding:{holding.pk}',
                holding=holding,
                product_type=holding.product_type,
                display_name=_holding_label(holding),
                expected_qty=holding.quantity,
            )
        return

    groups: dict[str, dict] = defaultdict(lambda: {'qty': 0, 'label': '', 'product_type': None})

    for holding in holdings:
        if holding.product_type_id:
            key = f'pt:{holding.product_type_id}'
            groups[key]['label'] = holding.product_type.name
            groups[key]['product_type'] = holding.product_type
        elif holding.crypto_token_id:
            key = f'crypto:{holding.crypto_token_id}'
            groups[key]['label'] = holding.crypto_token.name
        else:
            key = f'class:{holding.asset_class}'
            class_label = dict(Holding.ASSET_CLASSES).get(holding.asset_class, holding.asset_class)
            groups[key]['label'] = f'{class_label} (no product type)'
        groups[key]['qty'] += holding.quantity

    for key, data in sorted(groups.items(), key=lambda kv: kv[1]['label'].lower()):
        AuditLineItem.objects.create(
            audit=audit,
            line_kind='product_type',
            group_key=key,
            holding=None,
            product_type=data['product_type'],
            display_name=data['label'],
            expected_qty=data['qty'],
        )