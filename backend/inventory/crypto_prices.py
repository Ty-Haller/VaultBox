import requests

CRYPTO_IDS = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'SOL': 'solana',
    'XRP': 'ripple',
    'ADA': 'cardano',
    'DOT': 'polkadot',
    'LTC': 'litecoin',
    'DOGE': 'dogecoin',
}


def _ids_for_symbols(symbols):
    from administration.models import CryptoTokenType

    id_to_symbol = {}
    for sym in symbols:
        sym = sym.upper()
        token = CryptoTokenType.objects.filter(symbol__iexact=sym, is_active=True).first()
        if token and token.coingecko_id:
            id_to_symbol[token.coingecko_id] = sym
        elif sym in CRYPTO_IDS:
            id_to_symbol[CRYPTO_IDS[sym]] = sym
    return id_to_symbol


def fetch_crypto_prices(symbols=None):
    """Fetch USD spot prices from CoinGecko."""
    from django.utils import timezone

    if symbols:
        symbols = [s.upper() for s in symbols]
        id_to_symbol = _ids_for_symbols(symbols)
    else:
        from administration.models import CryptoTokenType

        tokens = CryptoTokenType.objects.filter(is_active=True)
        id_to_symbol = {}
        for t in tokens:
            if t.coingecko_id:
                id_to_symbol[t.coingecko_id] = t.symbol.upper()
        if not id_to_symbol:
            id_to_symbol = {v: k for k, v in CRYPTO_IDS.items()}

    ids = list(id_to_symbol.keys())
    if not ids:
        return []

    try:
        resp = requests.get(
            'https://api.coingecko.com/api/v3/simple/price',
            params={
                'ids': ','.join(ids),
                'vs_currencies': 'usd',
                'include_24hr_change': 'true',
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        return _fallback_prices(list(id_to_symbol.values()))

    now = timezone.now().isoformat()
    results = []
    for coin_id, info in data.items():
        symbol = id_to_symbol.get(coin_id)
        if not symbol:
            continue
        spot = float(info.get('usd', 0))
        change_pct = float(info.get('usd_24h_change', 0) or 0)
        results.append({
            'symbol': symbol,
            'spot': spot,
            'changePercent24h': round(change_pct, 2),
            'updatedAt': now,
        })
    return results


def _fallback_prices(symbols):
    from django.utils import timezone

    defaults = {
        'BTC': 95000, 'ETH': 3400, 'SOL': 180, 'XRP': 2.1,
        'ADA': 0.75, 'DOT': 7.5, 'LTC': 95, 'DOGE': 0.18,
    }
    now = timezone.now().isoformat()
    return [
        {'symbol': s, 'spot': defaults.get(s, 1), 'changePercent24h': 0, 'updatedAt': now}
        for s in symbols
    ]