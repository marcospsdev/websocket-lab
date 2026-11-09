import { useBinanceTicker } from '@/hooks'
import type { Symbol } from '@/endpoints'
import { formatPercent, formatPrice } from '@/utils/formatters'
import { ConnectionStatusBadge } from './ConnectionStatusBadge'

type PriceTickerCardProps = {
  symbol: Symbol
}

export const PriceTickerCard = ({ symbol }: PriceTickerCardProps) => {
  const { ticker, status } = useBinanceTicker(symbol)
  const isUp = (ticker?.changePercent ?? 0) >= 0

  return (
    <div className='flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4'>
      <div className='flex items-center justify-between'>
        <span className='text-sm font-semibold text-slate-300'>{symbol}</span>
        <ConnectionStatusBadge status={status} />
      </div>

      {ticker ? (
        <>
          <span className={`text-2xl font-bold tabular-nums ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatPrice(ticker.lastPrice)}
          </span>
          <div className='flex items-center justify-between text-xs text-slate-400'>
            <span className={isUp ? 'text-emerald-400' : 'text-red-400'}>{formatPercent(ticker.changePercent)} (24h)</span>
            <span>
              H {formatPrice(ticker.highPrice)} · L {formatPrice(ticker.lowPrice)}
            </span>
          </div>
        </>
      ) : (
        <span className='text-sm text-slate-500'>Waiting for first message…</span>
      )}
    </div>
  )
}
