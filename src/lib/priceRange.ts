export type PriceChartRange = '1d' | '7d' | '30d' | '90d' | '1y' | 'max'

export const PRICE_CHART_RANGE_LABELS: Record<PriceChartRange, string> = {
  '1d': '1D',
  '7d': '7D',
  '30d': '1M',
  '90d': '3M',
  '1y': '1Y',
  max: 'All',
}

export const PRICE_CHART_RANGES: PriceChartRange[] = ['1d', '7d', '30d', '90d', '1y', 'max']