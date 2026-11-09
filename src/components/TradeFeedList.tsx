import type { Trade } from '@/types/binance'
import { formatPrice, formatQuantity, formatTime } from '@/utils/formatters'

type TradeFeedListProps = {
  trades: Trade[]
}

export const TradeFeedList = ({ trades }: TradeFeedListProps) => {
  if (trades.length === 0) {
    return <p className='py-10 text-center text-sm text-slate-500'>Waiting for the first trade…</p>
  }

  return (
    <div className='divide-y divide-white/5'>
      {trades.map(trade => (
        <div key={trade.id} className='grid grid-cols-4 gap-2 px-4 py-2 text-sm tabular-nums'>
          <span className='text-slate-500'>{formatTime(trade.time)}</span>
          <span className={trade.side === 'buy' ? 'text-emerald-400' : 'text-red-400'}>{formatPrice(trade.price)}</span>
          <span className='text-slate-300'>{formatQuantity(trade.quantity)}</span>
          <span className={`text-right uppercase text-xs font-semibold ${trade.side === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
            {trade.side}
          </span>
        </div>
      ))}
    </div>
  )
}
