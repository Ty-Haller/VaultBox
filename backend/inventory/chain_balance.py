"""Fetch on-chain wallet balances for supported networks."""

import requests

CHAIN_MAP = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'DOGE': 'dogecoin',
    'LTC': 'litecoin',
    'SOL': 'solana',
}


def _btc_balance(address: str) -> float | None:
    try:
        resp = requests.get(
            f'https://blockstream.info/api/address/{address}',
            timeout=12,
        )
        resp.raise_for_status()
        data = resp.json()
        funded = data.get('chain_stats', {}).get('funded_txo_sum', 0)
        spent = data.get('chain_stats', {}).get('spent_txo_sum', 0)
        sats = funded - spent
        return round(sats / 1e8, 8)
    except Exception:
        return None


def _eth_balance(address: str) -> float | None:
    if not address.startswith('0x'):
        return None
    try:
        resp = requests.post(
            'https://eth.llamarpc.com',
            json={
                'jsonrpc': '2.0',
                'method': 'eth_getBalance',
                'params': [address, 'latest'],
                'id': 1,
            },
            timeout=12,
        )
        resp.raise_for_status()
        result = resp.json().get('result')
        if result:
            wei = int(result, 16)
            return round(wei / 1e18, 8)
    except Exception:
        pass
    return None


def _doge_balance(address: str) -> float | None:
    try:
        resp = requests.get(
            f'https://api.blockcypher.com/v1/doge/main/addrs/{address}/balance',
            timeout=12,
        )
        resp.raise_for_status()
        data = resp.json()
        return round(data.get('balance', 0) / 1e8, 8)
    except Exception:
        return None


def _ltc_balance(address: str) -> float | None:
    try:
        resp = requests.get(
            f'https://api.blockcypher.com/v1/ltc/main/addrs/{address}/balance',
            timeout=12,
        )
        resp.raise_for_status()
        data = resp.json()
        return round(data.get('balance', 0) / 1e8, 8)
    except Exception:
        return None


def fetch_chain_balance(address: str, symbol: str, chain: str | None = None) -> dict:
    """Return balance for address on the given token's chain."""
    address = (address or '').strip()
    symbol = (symbol or '').upper()
    chain = chain or CHAIN_MAP.get(symbol, 'other')

    if not address:
        return {'balance': None, 'error': 'Address required'}

    balance = None
    if chain == 'bitcoin' or symbol == 'BTC':
        balance = _btc_balance(address)
    elif chain == 'ethereum' or symbol in ('ETH', 'ETHEREUM'):
        balance = _eth_balance(address)
    elif chain == 'dogecoin' or symbol == 'DOGE':
        balance = _doge_balance(address)
    elif chain == 'litecoin' or symbol == 'LTC':
        balance = _ltc_balance(address)
    else:
        return {'balance': None, 'error': f'Chain lookup not supported for {symbol}'}

    if balance is None:
        return {'balance': None, 'error': 'Could not fetch balance from chain'}
    return {'balance': balance, 'symbol': symbol, 'address': address}