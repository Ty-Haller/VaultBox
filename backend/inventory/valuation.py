from .crypto_prices import fetch_crypto_prices
from .metal_prices import BASE_PRICES, fetch_metal_prices


def is_active_holding(holding) -> bool:
    return not holding.status or holding.status == 'active'


def holding_cost(holding) -> float:
    return float(holding.purchase_price or 0) * holding.quantity


def pure_metal_oz(holding) -> float:
    if holding.asset_class != 'bullion' or not holding.metal_type or holding.weight_oz is None:
        return 0.0
    return float(holding.weight_oz) * float(holding.purity or 1) * holding.quantity


def _crypto_price_map(holdings, crypto_prices_list, *, fetch_missing: bool = True) -> dict[str, float]:
    price_map = {p['symbol'].upper(): float(p['spot']) for p in crypto_prices_list}
    if not fetch_missing:
        return price_map
    symbols = {
        (h.crypto_symbol or '').upper()
        for h in holdings
        if h.asset_class == 'crypto' and h.crypto_symbol
    }
    missing = [s for s in symbols if s and s not in price_map]
    if missing:
        for p in fetch_crypto_prices(missing):
            price_map[p['symbol'].upper()] = float(p['spot'])
    return price_map


def holding_spot_value(holding, metal_prices: dict[str, float], crypto_prices: dict[str, float]) -> float:
    if holding.asset_class == 'crypto':
        if holding.reported_value is not None:
            return float(holding.reported_value)
        symbol = (holding.crypto_symbol or '').upper()
        qty = float(holding.crypto_quantity or 0)
        if symbol and qty and symbol in crypto_prices:
            return qty * crypto_prices[symbol]
        return holding_cost(holding)
    if holding.reported_value is not None and holding.asset_class != 'bullion':
        return float(holding.reported_value)
    metal = holding.metal_type or ''
    spot = metal_prices.get(metal)
    if not metal or spot is None:
        return holding_cost(holding)
    return pure_metal_oz(holding) * spot


def build_price_context(holdings, *, live_prices: bool = True):
    metal_prices = fetch_metal_prices() if live_prices else dict(BASE_PRICES)
    crypto_symbols = list({
        (h.crypto_symbol or '').upper()
        for h in holdings
        if h.asset_class == 'crypto' and h.crypto_symbol
    })
    if live_prices and crypto_symbols:
        crypto_list = fetch_crypto_prices(crypto_symbols)
    else:
        crypto_list = []
    crypto_prices = _crypto_price_map(holdings, crypto_list, fetch_missing=live_prices)
    return metal_prices, crypto_prices