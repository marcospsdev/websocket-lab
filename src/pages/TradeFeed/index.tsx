import { useState } from 'react'
import type { Symbol } from '@/endpoints'
import { useBinanceTrades } from '@/hooks'
import { ConnectionStatusBadge } from '@/components/ConnectionStatusBadge'
import { SymbolSelector } from '@/components/SymbolSelector'
import { TradeFeedList } from '@/components/TradeFeedList'

export const TradeFeed = () => {
  const [symbol, setSymbol] = useState<Symbol>('BTCUSDT')
  const { trades, status } = useBinanceTrades(symbol)

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h1 className='text-xl font-bold text-white'>Live trade feed</h1>
          <p className='text-sm text-slate-400'>Every trade executed on Binance for the selected pair, as it happens.</p>
        </div>
        <ConnectionStatusBadge status={status} />
      </div>

      <SymbolSelector value={symbol} onChange={setSymbol} />

      <div className='rounded-xl border border-white/10 bg-white/[0.03]'>
        <TradeFeedList trades={trades} />
      </div>
    </div>
  )
}
