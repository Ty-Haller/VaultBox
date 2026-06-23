"""Which AppSetting keys are safe for non-admin authenticated users."""

PUBLIC_SETTING_KEYS = frozenset({
    'default_currency',
    'portfolio_base_currency',
    'price_refresh_interval',
    'enable_qr_labels',
    'price_ticker_config',
    'ticker_scroll_mode',
    'kitco_price_source',
    'api_rate_limit',
})