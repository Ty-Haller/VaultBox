import io
from datetime import date

from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.graphics.charts.barcharts import VerticalBarChart

from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.shapes import Drawing, String
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .models import Holding, PortfolioSnapshot, Site, Vault
from .qr import generate_qr_png, holding_lookup_url
from .valuation import (
    build_price_context,
    holding_cost,
    holding_spot_value,
    is_active_holding,
)


def _styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='TitleGold', parent=styles['Title'], textColor=colors.HexColor('#d4a017')))
    styles.add(ParagraphStyle(name='Muted', parent=styles['Normal'], fontSize=9, textColor=colors.grey))
    return styles


def _fmt_money(value) -> str:
    return f'${float(value):,.2f}'


def _date_str(value) -> str | None:
    if not value:
        return None
    if isinstance(value, date):
        return value.isoformat()
    return str(value)


def _date_in_range(value, date_from: str | None, date_to: str | None) -> bool:
    ds = _date_str(value)
    if not ds:
        return False
    if date_from and ds < date_from:
        return False
    if date_to and ds > date_to:
        return False
    return True


def _append_data_updated(story, styles, extra: str | None = None) -> None:
    story.append(Spacer(1, 16))
    line = f'Data last updated: {timezone.now().strftime("%Y-%m-%d %H:%M UTC")}'
    if extra:
        line += f' · {extra}'
    story.append(Paragraph(line, styles['Muted']))


def _period_label(date_from: str | None, date_to: str | None) -> str:
    if date_from and date_to:
        return f'{date_from} to {date_to}'
    if date_from:
        return f'From {date_from}'
    if date_to:
        return f'Through {date_to}'
    return 'All time'


def _summary_table(rows: list[list]) -> Table:
    table = Table(rows, colWidths=[2.2 * inch, 1.5 * inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#111b24')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f4f7fa')]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e8eef3')),
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
    ]))
    return table


def _data_table(headers: list[str], rows: list[list], col_widths: list[float]) -> Table:
    table = Table([headers] + rows, colWidths=col_widths)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#111b24')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f4f7fa')]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e8eef3')),
        ('ALIGN', (3, 1), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    return table


def purchase_sale_pdf(
    holdings: list[Holding],
    date_from: str | None = None,
    date_to: str | None = None,
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.75 * inch)
    styles = _styles()
    period = _period_label(date_from, date_to)
    story = [
        Paragraph('VaultBox Purchases & Sales Report', styles['TitleGold']),
        Spacer(1, 12),
        Paragraph(f'Period: {period}', styles['Muted']),
        Spacer(1, 16),
    ]

    purchases = [
        h for h in holdings if _date_in_range(h.purchase_date, date_from, date_to)
    ]
    sales = [
        h for h in holdings
        if h.status == 'sold' and _date_in_range(h.transaction_date, date_from, date_to)
    ]

    total_purchased = sum(float(h.purchase_price or 0) * h.quantity for h in purchases)
    total_sold = sum(float(h.sale_price or 0) for h in sales)
    total_realized = sum(
        float(h.sale_price or 0) - float(h.purchase_price or 0) * h.quantity
        for h in sales
    )

    story.append(_summary_table([
        ['Metric', 'Amount'],
        ['Total purchases', _fmt_money(total_purchased)],
        ['Purchase count', str(len(purchases))],
        ['Total sales', _fmt_money(total_sold)],
        ['Sale count', str(len(sales))],
        ['Realized gain/loss', _fmt_money(total_realized)],
    ]))
    story.append(Spacer(1, 20))

    story.append(Paragraph('Purchases', styles['Heading2']))
    story.append(Spacer(1, 8))
    if purchases:
        purchase_rows = []
        for h in sorted(purchases, key=lambda x: _date_str(x.purchase_date) or '', reverse=True):
            purchase_rows.append([
                h.name[:36],
                _date_str(h.purchase_date) or '—',
                ((h.dealer.name if h.dealer_id else None) or '—')[:20],
                h.vault.name[:18],
                _fmt_money(float(h.purchase_price or 0) * h.quantity),
            ])
        story.append(_data_table(
            ['Item', 'Date', 'Dealer', 'Vault', 'Cost'],
            purchase_rows,
            [1.8 * inch, 0.9 * inch, 1.1 * inch, 1.1 * inch, 0.9 * inch],
        ))
    else:
        story.append(Paragraph('No purchases in this period.', styles['Normal']))
    story.append(Spacer(1, 16))

    story.append(Paragraph('Sales', styles['Heading2']))
    story.append(Spacer(1, 8))
    if sales:
        sale_rows = []
        for h in sorted(sales, key=lambda x: _date_str(x.transaction_date) or '', reverse=True):
            cost = float(h.purchase_price or 0) * h.quantity
            proceeds = float(h.sale_price or 0)
            sale_rows.append([
                h.name[:32],
                _date_str(h.transaction_date) or '—',
                (h.buyer_name or '—')[:16],
                h.vault.name[:16],
                _fmt_money(cost),
                _fmt_money(proceeds),
                _fmt_money(proceeds - cost),
            ])
        story.append(_data_table(
            ['Item', 'Date', 'Buyer', 'Vault', 'Cost Basis', 'Proceeds', 'Gain/Loss'],
            sale_rows,
            [1.4 * inch, 0.8 * inch, 0.9 * inch, 0.9 * inch, 0.85 * inch, 0.85 * inch, 0.85 * inch],
        ))
    else:
        story.append(Paragraph('No sales in this period.', styles['Normal']))

    _append_data_updated(story, styles)
    doc.build(story)
    return buffer.getvalue()


def _pl_breakdown_chart(realized: float, unrealized: float) -> Drawing | None:
    if realized == 0 and unrealized == 0:
        return None
    drawing = Drawing(420, 180)
    drawing.add(String(10, 165, 'P/L Breakdown', fontSize=11, fillColor=colors.HexColor('#111b24')))
    chart = VerticalBarChart()
    chart.x = 60
    chart.y = 30
    chart.height = 110
    chart.width = 320
    chart.data = [[realized, unrealized]]
    chart.categoryAxis.categoryNames = ['Realized', 'Unrealized']
    chart.categoryAxis.labels.boxAnchor = 'n'
    chart.valueAxis.labels.fontSize = 8
    chart.bars[0].fillColor = colors.HexColor('#d4a017')
    chart.bars[0].strokeColor = colors.HexColor('#b88914')
    vals = [realized, unrealized]
    chart.valueAxis.valueMin = min(0, *vals) * 1.15 if min(vals) < 0 else 0
    chart.valueAxis.valueMax = max(0, *vals) * 1.15 if max(vals) > 0 else 1
    drawing.add(chart)
    return drawing


def _portfolio_history_chart(snapshots: list[PortfolioSnapshot]) -> Drawing | None:
    if len(snapshots) < 2:
        return None
    drawing = Drawing(420, 200)
    drawing.add(String(10, 185, 'Portfolio Spot Value by Period', fontSize=11, fillColor=colors.HexColor('#111b24')))
    chart = VerticalBarChart()
    chart.x = 55
    chart.y = 35
    chart.height = 130
    chart.width = 340
    chart.data = [[float(s.total_value) for s in snapshots]]
    chart.categoryAxis.categoryNames = [str(s.date)[5:10] for s in snapshots]
    chart.categoryAxis.labels.angle = 30
    chart.categoryAxis.labels.fontSize = 7
    chart.valueAxis.labels.fontSize = 8
    chart.bars[0].fillColor = colors.HexColor('#d4a017')
    chart.bars[0].strokeColor = colors.HexColor('#b88914')
    ymax = max(float(s.total_value) for s in snapshots) * 1.1 or 1
    chart.valueAxis.valueMin = 0
    chart.valueAxis.valueMax = ymax
    drawing.add(chart)
    return drawing


def _unrealized_metal_pie(unrealized_holdings: list[Holding], metal_prices, crypto_prices) -> Drawing | None:
    by_metal: dict[str, float] = {}
    for h in unrealized_holdings:
        spot = holding_spot_value(h, metal_prices, crypto_prices)
        gain = spot - holding_cost(h)
        label = (h.metal_type or h.asset_class or 'other').title()
        by_metal[label] = by_metal.get(label, 0) + abs(gain)
    entries = [(k, v) for k, v in by_metal.items() if v > 0]
    if not entries:
        return None
    drawing = Drawing(420, 200)
    drawing.add(String(10, 185, 'Unrealized P/L by Asset Type', fontSize=11, fillColor=colors.HexColor('#111b24')))
    pie = Pie()
    pie.x = 120
    pie.y = 25
    pie.width = 120
    pie.height = 120
    pie.data = [v for _, v in entries]
    pie.labels = [k[:12] for k, _ in entries]
    pie.slices.strokeWidth = 0.5
    palette = ['#d4a017', '#5a7a96', '#2d8f6f', '#c45c26', '#6b5b95']
    for i in range(len(pie.data)):
        pie.slices[i].fillColor = colors.HexColor(palette[i % len(palette)])
    drawing.add(pie)
    return drawing


def profit_loss_pdf(
    holdings: list[Holding],
    snapshots: list[PortfolioSnapshot],
    date_from: str | None = None,
    date_to: str | None = None,
    include_charts: bool = False,
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.75 * inch)
    styles = _styles()
    period = _period_label(date_from, date_to)
    story = [
        Paragraph('VaultBox Profit & Loss Report', styles['TitleGold']),
        Spacer(1, 12),
        Paragraph(f'Period: {period}', styles['Muted']),
        Spacer(1, 16),
    ]

    sales = [
        h for h in holdings
        if h.status == 'sold' and _date_in_range(h.transaction_date, date_from, date_to)
    ]
    unrealized_holdings = [
        h for h in holdings
        if is_active_holding(h) and _date_in_range(h.purchase_date, date_from, date_to)
    ]

    realized_pl = sum(
        float(h.sale_price or 0) - holding_cost(h) for h in sales
    )
    metal_prices, crypto_prices = build_price_context(holdings, live_prices=False)
    unrealized_rows = []
    for h in unrealized_holdings:
        spot = holding_spot_value(h, metal_prices, crypto_prices)
        cost = holding_cost(h)
        unrealized_rows.append((h, cost, spot, spot - cost))
    unrealized_pl = sum(row[3] for row in unrealized_rows)
    total_pl = realized_pl + unrealized_pl
    unrealized_cost = sum(row[1] for row in unrealized_rows)
    unrealized_roi = (unrealized_pl / unrealized_cost * 100) if unrealized_cost > 0 else 0

    story.append(_summary_table([
        ['Metric', 'Amount'],
        ['Realized P/L', _fmt_money(realized_pl)],
        ['Sale count', str(len(sales))],
        ['Unrealized P/L', _fmt_money(unrealized_pl)],
        ['Unrealized holdings', str(len(unrealized_rows))],
        ['Total P/L', _fmt_money(total_pl)],
        ['Unrealized ROI', f'{unrealized_roi:.1f}%'],
    ]))
    story.append(Spacer(1, 16))

    if include_charts:
        story.append(Paragraph('Charts', styles['Heading2']))
        story.append(Spacer(1, 8))
        pl_chart = _pl_breakdown_chart(realized_pl, unrealized_pl)
        if pl_chart:
            story.append(pl_chart)
            story.append(Spacer(1, 12))
        period_snapshots = [
            s for s in snapshots if _date_in_range(s.date, date_from, date_to)
        ]
        portfolio_chart = _portfolio_history_chart(period_snapshots or snapshots)
        if portfolio_chart:
            story.append(portfolio_chart)
            story.append(Spacer(1, 12))
        metal_pie = _unrealized_metal_pie(unrealized_holdings, metal_prices, crypto_prices)
        if metal_pie:
            story.append(metal_pie)
            story.append(Spacer(1, 12))

    story.append(Paragraph('Realized (sales)', styles['Heading2']))
    story.append(Spacer(1, 8))
    if sales:
        sale_rows = []
        for h in sorted(sales, key=lambda x: _date_str(x.transaction_date) or '', reverse=True):
            cost = holding_cost(h)
            proceeds = float(h.sale_price or 0)
            sale_rows.append([
                h.name[:36],
                _fmt_money(cost),
                _fmt_money(proceeds),
                _fmt_money(proceeds - cost),
            ])
        story.append(_data_table(
            ['Item', 'Cost Basis', 'Proceeds', 'Gain/Loss'],
            sale_rows,
            [2.4 * inch, 1.1 * inch, 1.1 * inch, 1.1 * inch],
        ))
    else:
        story.append(Paragraph('No sales in this period.', styles['Normal']))
    story.append(Spacer(1, 16))

    story.append(Paragraph('Unrealized (active holdings acquired in period)', styles['Heading2']))
    story.append(Spacer(1, 8))
    if unrealized_rows:
        unrealized_table_rows = []
        for h, cost, spot, gain in sorted(unrealized_rows, key=lambda r: r[3], reverse=True):
            roi = (gain / cost * 100) if cost > 0 else 0
            unrealized_table_rows.append([
                h.name[:32],
                (h.metal_type or '—').title()[:10],
                _fmt_money(cost),
                _fmt_money(spot),
                f'{_fmt_money(gain)} ({roi:.1f}%)',
            ])
        story.append(_data_table(
            ['Item', 'Metal', 'Cost', 'Spot', 'Gain/Loss'],
            unrealized_table_rows,
            [1.8 * inch, 0.7 * inch, 0.9 * inch, 0.9 * inch, 1.4 * inch],
        ))
    else:
        story.append(Paragraph('No active holdings acquired in this period.', styles['Normal']))

    _append_data_updated(story, styles)
    doc.build(story)
    return buffer.getvalue()


def portfolio_pdf(snapshots: list[PortfolioSnapshot]) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.75 * inch)
    styles = _styles()
    story = [
        Paragraph('VaultBox Portfolio Report', styles['TitleGold']),
        Spacer(1, 12),
        Paragraph('Historical portfolio valuation summary', styles['Muted']),
        Spacer(1, 20),
    ]

    if snapshots:
        rows = [['Date', 'Spot Value', 'Cost Basis', 'Gold oz', 'Silver oz']]
        for s in snapshots:
            rows.append([
                str(s.date),
                _fmt_money(s.total_value),
                _fmt_money(s.total_cost),
                f'{float(s.gold_oz):,.2f}',
                f'{float(s.silver_oz):,.2f}',
            ])
        table = Table(rows, colWidths=[1.1 * inch, 1.3 * inch, 1.3 * inch, 1 * inch, 1 * inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#111b24')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f4f7fa')]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e8eef3')),
            ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
        ]))
        story.append(table)
    else:
        story.append(Paragraph('No portfolio history available.', styles['Normal']))

    _append_data_updated(story, styles)
    doc.build(story)
    return buffer.getvalue()


def inventory_pdf(holdings: list[Holding]) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.75 * inch)
    styles = _styles()
    story = [
        Paragraph('VaultBox Inventory Report', styles['TitleGold']),
        Spacer(1, 12),
        Paragraph(f'{len(holdings)} holdings', styles['Muted']),
        Spacer(1, 16),
    ]

    rows = [['Item', 'Metal', 'Pure Oz', 'Qty', 'Cost', 'Vault']]
    for h in holdings:
        pure = float(h.weight_oz) * float(h.purity) * h.quantity
        rows.append([
            h.name[:40],
            h.metal_type.title(),
            f'{pure:,.2f}',
            str(h.quantity),
            _fmt_money(h.purchase_price * h.quantity),
            h.vault.name[:24],
        ])

    table = Table(rows, colWidths=[2.2 * inch, 0.7 * inch, 0.8 * inch, 0.5 * inch, 1 * inch, 1.5 * inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#111b24')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f4f7fa')]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e8eef3')),
        ('ALIGN', (2, 1), (4, -1), 'RIGHT'),
    ]))
    story.append(table)
    _append_data_updated(story, styles)
    doc.build(story)
    return buffer.getvalue()


def labels_pdf(holdings: list[Holding], per_page: int = 6) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5 * inch, leftMargin=0.5 * inch)
    styles = _styles()
    story = [Paragraph('VaultBox QR Labels', styles['TitleGold']), Spacer(1, 16)]

    label_rows = []
    for h in holdings:
        qr_bytes = generate_qr_png(holding_lookup_url(h), box_size=4)
        qr_img = Image(io.BytesIO(qr_bytes), width=0.9 * inch, height=0.9 * inch)
        info = Paragraph(
            f'<b>{h.name}</b><br/>'
            f'{h.metal_type.title()} · {float(h.weight_oz):.2f} oz · Qty {h.quantity}<br/>'
            f'<font size="7">SN: {h.serial_number or "—"} · QR: {h.qr_code}</font>',
            styles['Normal'],
        )
        label_rows.append([qr_img, info])

    cols = 2
    for i in range(0, len(label_rows), cols):
        chunk = label_rows[i:i + cols]
        while len(chunk) < cols:
            chunk.append(['', ''])
        table = Table(chunk, colWidths=[1.2 * inch, 3.3 * inch])
        table.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#e8eef3')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e8eef3')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(table)
        story.append(Spacer(1, 10))

    _append_data_updated(story, styles)
    doc.build(story)
    return buffer.getvalue()