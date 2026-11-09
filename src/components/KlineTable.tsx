import type { Kline } from '@/types/binance'
import { formatPrice, formatTime } from '@/utils/formatters'

type KlineTableProps = {
  klines: Kline[]
}

export const KlineTable = ({ klines }: KlineTableProps) => {
  if (klines.length === 0) {
    return <p className='py-10 text-center text-sm text-slate-500'>Waiting for the first candle…</p>
  }

  return (
    <table className='w-full text-sm tabular-nums'>
      <thead>
        <tr className='text-left text-xs uppercase tracking-wide text-slate-500'>
          <th className='px-4 py-2 font-medium'>Open time</th>
          <th className='px-4 py-2 font-medium'>Open</th>
          <th className='px-4 py-2 font-medium'>High</th>
          <th className='px-4 py-2 font-medium'>Low</th>
          <th className='px-4 py-2 font-medium'>Close</th>
          <th className='px-4 py-2 font-medium'>Status</th>
        </tr>
      </thead>
      <tbody className='divide-y divide-white/5'>
        {klines.map(kline => (
          <tr key={kline.openTime}>
            <td className='px-4 py-2 text-slate-400'>{formatTime(kline.openTime)}</td>
            <td className='px-4 py-2'>{formatPrice(kline.open)}</td>
            <td className='px-4 py-2 text-emerald-400'>{formatPrice(kline.high)}</td>
            <td className='px-4 py-2 text-red-400'>{formatPrice(kline.low)}</td>
            <td className='px-4 py-2 font-semibold'>{formatPrice(kline.close)}</td>
            <td className='px-4 py-2'>
              {kline.isFinal ? (
                <span className='text-xs text-slate-500'>closed</span>
              ) : (
                <span className='text-xs text-amber-400'>forming…</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
