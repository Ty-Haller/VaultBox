import io

import qrcode


def generate_qr_png(data: str, box_size: int = 8) -> bytes:
    qr = qrcode.QRCode(version=1, box_size=box_size, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color='black', back_color='white')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    return buffer.getvalue()


def holding_lookup_url(holding) -> str:
    from administration.site_config import get_frontend_base_url
    return f'{get_frontend_base_url().rstrip("/")}/lookup/{holding.qr_code}'


def holding_detail_url(holding) -> str:
    from administration.site_config import get_frontend_base_url
    return f'{get_frontend_base_url().rstrip("/")}/inventory/{holding.id}'