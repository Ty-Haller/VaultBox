"""Per-instrument market price alert thresholds."""

from __future__ import annotations

import json

from .models import AppSetting

DEFAULT_MARKET_ALERT_CONFIG = {
    'percentChangeThreshold': 1.0,
    'priceAbove': None,
    'priceBelow': None,
}


def instrument_key(instrument_type: str, symbol: str) -> str:
    return f'{instrument_type}:{symbol}'


def _parse_stored(raw: str | None) -> dict:
    if not raw:
        return {'instruments': {}}
    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return {'instruments': {}}
    if not isinstance(data, dict):
        return {'instruments': {}}
    if 'instruments' in data and isinstance(data['instruments'], dict):
        return data
    if any(k in data for k in DEFAULT_MARKET_ALERT_CONFIG):
        return {'instruments': {}, '_legacy_default': data}
    return {'instruments': {}}


def _legacy_default(data: dict) -> dict:
    legacy = data.get('_legacy_default')
    if isinstance(legacy, dict):
        merged = dict(DEFAULT_MARKET_ALERT_CONFIG)
        merged.update(legacy)
        return merged
    return dict(DEFAULT_MARKET_ALERT_CONFIG)


def _load_store() -> dict:
    row = AppSetting.objects.filter(key='market_alert_config').first()
    return _parse_stored(row.value if row else None)


def _save_store(data: dict) -> None:
    payload = {'instruments': data.get('instruments', {})}
    AppSetting.objects.update_or_create(
        key='market_alert_config',
        defaults={
            'value': json.dumps(payload),
            'value_type': 'json',
            'category': 'integration',
            'description': 'Per-instrument market price notification thresholds',
        },
    )


def _merge_config(base: dict, override: dict | None) -> dict:
    merged = dict(base)
    if override:
        merged.update(override)
    return merged


def get_instrument_alert_config(instrument_type: str, symbol: str) -> dict:
    store = _load_store()
    key = instrument_key(instrument_type, symbol)
    instruments = store.get('instruments', {})
    override = instruments.get(key)
    if isinstance(override, dict):
        return _merge_config(DEFAULT_MARKET_ALERT_CONFIG, override)
    return _merge_config(DEFAULT_MARKET_ALERT_CONFIG, _legacy_default(store))


def list_instrument_alert_configs() -> list[dict]:
    store = _load_store()
    instruments = store.get('instruments', {})
    default = _legacy_default(store)
    results: list[dict] = []
    seen: set[str] = set()
    for key, cfg in instruments.items():
        if not isinstance(cfg, dict) or ':' not in key:
            continue
        inst_type, symbol = key.split(':', 1)
        seen.add(key)
        merged = _merge_config(default, cfg)
        results.append({
            'type': inst_type,
            'symbol': symbol,
            **merged,
        })
    return sorted(results, key=lambda x: (x['type'], x['symbol'].lower()))


def save_instrument_alert_config(instrument_type: str, symbol: str, data: dict) -> dict:
    store = _load_store()
    instruments = dict(store.get('instruments', {}))
    key = instrument_key(instrument_type, symbol)
    current = instruments.get(key, {})
    if not isinstance(current, dict):
        current = {}
    merged = _merge_config(DEFAULT_MARKET_ALERT_CONFIG, current)
    for field in ('percentChangeThreshold', 'priceAbove', 'priceBelow'):
        if field in data:
            merged[field] = data[field]
    instruments[key] = merged
    store['instruments'] = instruments
    _save_store(store)
    return merged


def get_market_alert_config() -> dict:
    """Legacy global accessor — returns default thresholds."""
    store = _load_store()
    return _legacy_default(store)


def save_market_alert_config(data: dict) -> dict:
    """Legacy global saver — applies as default for instruments without overrides."""
    store = _load_store()
    default = _legacy_default(store)
    for key in ('percentChangeThreshold', 'priceAbove', 'priceBelow'):
        if key in data:
            default[key] = data[key]
    store['_legacy_default'] = default
    if 'instruments' not in store:
        store['instruments'] = {}
    _save_store(store)
    return default