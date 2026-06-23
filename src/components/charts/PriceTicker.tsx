import { useEffect, useRef, useState } from 'react'
import { usePrices } from '../../context/PricesContext'
import { formatCurrency, formatPercent, cn } from '../../lib/utils'
import { RefreshCw } from 'lucide-react'

export function PriceTicker() {
  const { tickerItems, tickerScrollMode, loading, refreshing, error, lastUpdated, refresh } = usePrices()
  const trackRef = useRef<HTMLDivElement>(null)
  const [overflows, setOverflows] = useState(false)

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const check = () => setOverflows(el.scrollWidth > el.clientWidth + 4)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [tickerItems])

  const useMarquee = tickerScrollMode === 'auto' && overflows && tickerItems.length > 0

  if (loading && tickerItems.length === 0) {
    return (
      <div className="border-t border-vault-100 bg-vault-50 px-6 py-2 text-xs text-vault-500 dark:border-vault-700 dark:bg-vault-900 dark:text-vault-400">
        Loading spot prices...
      </div>
    )
  }

  const itemNodes = tickerItems.map((item) => (
    <div key={item.id} className="flex shrink-0 items-center gap-2 text-xs">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color ?? '#5a7a96' }} />
      <span className="font-medium text-vault-700 dark:text-vault-300">{item.label}</span>
      <span className="font-mono font-semibold text-vault-900 dark:text-vault-100">
        {item.type === 'forex' && item.symbol !== 'USD' ? item.spot.toFixed(4) : formatCurrency(item.spot)}
      </span>
      <span className={item.changePercent24h >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
        {formatPercent(item.changePercent24h)}
      </span>
    </div>
  ))

  return (
    <div className="flex items-center gap-4 border-t border-vault-100 bg-vault-50 px-6 py-2 dark:border-vault-700 dark:bg-vault-900">
      <div
        ref={trackRef}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-6',
          useMarquee ? 'overflow-hidden' : 'overflow-x-auto'
        )}
      >
        {error && tickerItems.length === 0 ? (
          <span className="text-xs text-red-600">{error}</span>
        ) : useMarquee ? (
          <div className="ticker-marquee flex shrink-0 items-center gap-6">
            <div className="flex shrink-0 items-center gap-6 pr-6">{itemNodes}</div>
            <div className="flex shrink-0 items-center gap-6 pr-6" aria-hidden="true">{itemNodes}</div>
          </div>
        ) : (
          itemNodes
        )}
      </div>
      <button
        type="button"
        onClick={() => refresh()}
        disabled={refreshing}
        title="Refresh spot prices"
        className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-vault-500 hover:bg-vault-200/60 hover:text-vault-700 disabled:opacity-50 dark:text-vault-400 dark:hover:text-vault-200"
      >
        <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
        <span>
          {refreshing ? 'Refreshing...' : lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Refresh'}
        </span>
      </button>
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-marquee {
          animation: ticker-scroll 40s linear infinite;
        }
        .ticker-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}