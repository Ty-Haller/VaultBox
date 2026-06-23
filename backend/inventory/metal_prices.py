import requests

METAL_SYMBOLS = {
    'gold': 'XAU',
    'silver': 'XAG',
    'platinum': 'XPT',
    'palladium': 'XPD',
}

BASE_PRICES = {
    'gold': 2347.5,
    'silver': 28.42,
    'platinum': 982.3,
    'palladium': 1045.8,
}


def fetch_metal_prices() -> dict[str, float]:
    """Return USD spot per troy oz keyed by metal slug."""
    prices: dict[str, float] = {}
    for metal, symbol in METAL_SYMBOLS.items():
        try:
            res = requests.get(
                f'https://api.gold-api.com/price/{symbol}',
                timeout=5,
            )
            res.raise_for_status()
            data = res.json()
            spot = float(data.get('price') or 0)
            if spot > 0:
                prices[metal] = spot
                continue
        except (requests.RequestException, TypeError, ValueError):
            pass
        prices[metal] = BASE_PRICES[metal]
    return prices