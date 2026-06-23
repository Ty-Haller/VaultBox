"""Historical price series for live price charts."""

from __future__ import annotations

import hashlib
import math
import random
from datetime import date, datetime, timedelta, timezone as dt_timezone

import requests

from .crypto_prices import CRYPTO_IDS, _ids_for_symbols
from .market_prices import FOREX_DEFAULTS, STOCK_DEFAULTS
from .metal_prices import BASE_PRICES, METAL_SYMBOLS

VALID_RANGES = {
    '1d': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
    'max': 730,
}

VALID_TYPES = {'metal', 'crypto', 'stock', 'forex'}


def _utc_now() -> datetime:
    return datetime.now(dt_timezone.utc)


def _to_iso(ts_ms: int | float) -> str:
    return datetime.fromtimestamp(ts_ms / 1000, tz=dt_timezone.utc).isoformat()


def _date_str(d: date) -> str:
    return d.isoformat()


def _downsample(points: list[dict], max_points: int = 400) -> list[dict]:
    if len(points) <= max_points:
        return points
    step = math.ceil(len(points) / max_points)
    sampled = points[::step]
    if sampled[-1] != points[-1]:
        sampled.append(points[-1])
    return sampled


def _synthetic_series(symbol: str, spot: float, days: int, daily_vol: float = 0.012) -> list[dict]:
    """Deterministic random-walk history ending at the current spot."""
    seed = int(hashlib.sha256(symbol.encode()).hexdigest()[:8], 16)
    rng = random.Random(seed)
    points: list[dict] = []
    price = spot
    today = _utc_now().date()
    for offset in range(days, -1, -1):
        d = today - timedelta(days=offset)
        if offset > 0:
            shock = rng.gauss(0, daily_vol)
            price = max(price * (1 + shock), spot * 0.2)
        else:
            price = spot
        points.append({'timestamp': _date_str(d), 'price': round(price, 4)})
    return points


def fetch_crypto_history(symbol: str, days: int) -> tuple[list[dict], str]:
    symbol = symbol.upper()
    id_map = _ids_for_symbols([symbol])
    coin_id = next(iter(id_map.keys()), None)
    if not coin_id and symbol in CRYPTO_IDS:
        coin_id = CRYPTO_IDS[symbol]

    if not coin_id:
        return [], 'unknown_crypto'

    cg_days = 'max' if days >= 365 else str(days)
    try:
        resp = requests.get(
            f'https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart',
            params={'vs_currency': 'usd', 'days': cg_days},
            timeout=12,
        )
        resp.raise_for_status()
        data = resp.json()
        raw = data.get('prices') or []
        if not raw:
            raise ValueError('empty series')
        cutoff = _utc_now() - timedelta(days=days)
        points = [
            {'timestamp': _to_iso(ts), 'price': round(float(price), 4)}
            for ts, price in raw
            if datetime.fromtimestamp(ts / 1000, tz=dt_timezone.utc) >= cutoff
        ]
        if points:
            return _downsample(points), 'coingecko'
    except (requests.RequestException, TypeError, ValueError):
        pass

    from .crypto_prices import fetch_crypto_prices

    live = fetch_crypto_prices([symbol])
    spot = float(live[0]['spot']) if live else 1.0
    return _synthetic_series(f'crypto-{symbol}', spot, days, 0.025), 'synthetic'


def _fetch_single_metal_spot(metal: str) -> float:
    api_symbol = METAL_SYMBOLS[metal]
    try:
        resp = requests.get(
            f'https://api.gold-api.com/price/{api_symbol}',
            timeout=5,
        )
        resp.raise_for_status()
        spot = float(resp.json().get('price') or 0)
        if spot > 0:
            return spot
    except (requests.RequestException, TypeError, ValueError):
        pass
    return float(BASE_PRICES[metal])


def fetch_metal_history(symbol: str, days: int) -> tuple[list[dict], str]:
    metal = symbol.lower()
    if metal not in METAL_SYMBOLS:
        return [], 'unknown_metal'

    spot = _fetch_single_metal_spot(metal)
    return _synthetic_series(f'metal-{metal}', spot, days, 0.008), 'synthetic'


def fetch_forex_history(symbol: str, days: int) -> tuple[list[dict], str]:
    symbol = symbol.upper()
    if symbol == 'USD':
        today = _utc_now().date()
        start = today - timedelta(days=days)
        return [
            {'timestamp': _date_str(start + timedelta(days=i)), 'price': 1.0}
            for i in range(days + 1)
        ], 'reference'

    today = _utc_now().date()
    start = today - timedelta(days=days)
    try:
        resp = requests.get(
            f'https://api.frankfurter.app/{_date_str(start)}..{_date_str(today)}',
            params={'from': symbol, 'to': 'USD'},
            timeout=10,
        )
        resp.raise_for_status()
        rates = resp.json().get('rates') or {}
        points = [
            {'timestamp': day, 'price': round(float(day_rates['USD']), 6)}
            for day, day_rates in sorted(rates.items())
            if isinstance(day_rates, dict) and 'USD' in day_rates
        ]
        if points:
            return points, 'frankfurter'
    except (requests.RequestException, TypeError, ValueError):
        pass

    info = FOREX_DEFAULTS.get(symbol)
    spot = float(info['spot']) if info else 1.0
    return _synthetic_series(f'forex-{symbol}', spot, days, 0.004), 'synthetic'


def fetch_stock_history(symbol: str, days: int) -> tuple[list[dict], str]:
    symbol = symbol.upper()
    info = STOCK_DEFAULTS.get(symbol)
    if not info:
        return [], 'unknown_stock'
    spot = float(info['spot'])
    return _synthetic_series(f'stock-{symbol}', spot, days, 0.015), 'synthetic'


def fetch_price_history(asset_type: str, symbol: str, range_key: str) -> dict:
    asset_type = asset_type.lower()
    range_key = range_key.lower()
    if asset_type not in VALID_TYPES:
        raise ValueError(f'Invalid asset type: {asset_type}')
    if range_key not in VALID_RANGES:
        raise ValueError(f'Invalid range: {range_key}')

    days = VALID_RANGES[range_key]
    symbol = symbol.strip()

    if asset_type == 'crypto':
        points, source = fetch_crypto_history(symbol, days)
    elif asset_type == 'metal':
        points, source = fetch_metal_history(symbol, days)
    elif asset_type == 'forex':
        points, source = fetch_forex_history(symbol, days)
    else:
        points, source = fetch_stock_history(symbol, days)

    return {
        'type': asset_type,
        'symbol': symbol.upper() if asset_type != 'metal' else symbol.lower(),
        'range': range_key,
        'source': source,
        'points': points,
    }