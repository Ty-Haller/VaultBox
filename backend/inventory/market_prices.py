"""Stock and forex quotes for the configurable price ticker."""

from django.utils import timezone

# Simulated/fallback stock prices (USD)
STOCK_DEFAULTS = {
    'SPY': {'spot': 589.2, 'label': 'S&P 500 (SPY)', 'change': 0.42},
    'GLD': {'spot': 234.8, 'label': 'Gold ETF (GLD)', 'change': 0.65},
    'SLV': {'spot': 27.15, 'label': 'Silver ETF (SLV)', 'change': -0.31},
    'QQQ': {'spot': 512.4, 'label': 'Nasdaq (QQQ)', 'change': 0.88},
    'IAU': {'spot': 48.2, 'label': 'Gold (IAU)', 'change': 0.61},
    'DIA': {'spot': 428.5, 'label': 'Dow (DIA)', 'change': 0.25},
}

FOREX_DEFAULTS = {
    'EUR': {'spot': 1.08, 'label': 'EUR/USD', 'change': -0.12},
    'GBP': {'spot': 1.27, 'label': 'GBP/USD', 'change': 0.08},
    'CAD': {'spot': 0.74, 'label': 'CAD/USD', 'change': -0.05},
    'JPY': {'spot': 0.0067, 'label': 'JPY/USD', 'change': 0.15},
    'USD': {'spot': 1.0, 'label': 'USD Index', 'change': 0},
}


def fetch_stock_prices(symbols):
    from administration.models import Currency

    now = timezone.now().isoformat()
    results = []
    for sym in symbols:
        sym = sym.upper()
        info = STOCK_DEFAULTS.get(sym)
        if not info:
            continue
        results.append({
            'type': 'stock',
            'symbol': sym,
            'label': info['label'],
            'spot': info['spot'],
            'changePercent24h': info['change'],
            'updatedAt': now,
        })
    return results


def fetch_forex_prices(symbols):
    from administration.models import Currency

    now = timezone.now().isoformat()
    results = []
    for sym in symbols:
        sym = sym.upper()
        if sym == 'USD':
            results.append({
                'type': 'forex',
                'symbol': 'USD',
                'label': 'USD',
                'spot': 1.0,
                'changePercent24h': 0,
                'updatedAt': now,
            })
            continue
        cur = Currency.objects.filter(code=sym, is_active=True).first()
        if cur:
            rate = float(cur.exchange_rate_to_usd)
            spot = round(1 / rate, 4) if rate else 1.0
            results.append({
                'type': 'forex',
                'symbol': sym,
                'label': f'{sym}/USD',
                'spot': spot,
                'changePercent24h': 0,
                'updatedAt': now,
            })
        elif sym in FOREX_DEFAULTS:
            info = FOREX_DEFAULTS[sym]
            results.append({
                'type': 'forex',
                'symbol': sym,
                'label': info['label'],
                'spot': info['spot'],
                'changePercent24h': info['change'],
                'updatedAt': now,
            })
    return results