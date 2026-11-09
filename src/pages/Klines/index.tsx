import { useState } from 'react'
import type { KlineInterval, Symbol } from '@/endpoints'
import { useBinanceKlines } from '@/hooks'
import { ConnectionStatusBadge } from '@/components/ConnectionStatusBadge'
import { IntervalSelector } from '@/components/IntervalSelector'
import { KlineTable } from '@/components/KlineTable'
import { SymbolSelector } from '@/components/SymbolSelector'

export const Klines = () => {
  const [symbol, setSymbol] = useState<Symbol>('BTCUSDT')
  const [interval, setInterval] = useState<KlineInterval>('1m')
  const { klines, status } = useBinanceKlines(symbol, interval)

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h1 className='text-xl font-bold text-white'>Live candlesticks (klines)</h1>
          <p className='text-sm text-slate-400'>
            The most recent row keeps updating every trade until the candle closes — watch the "forming…" badge.
          </p>
        </div>
        <ConnectionStatusBadge status={status} />
      </div>

      <div className='flex flex-wrap gap-4'>
        <SymbolSelector value={symbol} onChange={setSymbol} />
        <IntervalSelector value={interval} onChange={setInterval} />
      </div>

      <div className='overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]'>
        <KlineTable klines={klines} />
      </div>
    </div>
  )
}
