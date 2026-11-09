import { SYMBOLS } from '@/endpoints'
import { PriceTickerCard } from '@/components/PriceTickerCard'

export const Dashboard = () => (
  <div className='flex flex-col gap-6'>
    <div>
      <h1 className='text-xl font-bold text-white'>Live ticker dashboard</h1>
      <p className='text-sm text-slate-400'>
        Each card below opens its own <code className='text-slate-300'>useBinanceTicker</code> hook — but they all share the
        same physical WebSocket connection under the hood. Open devtools → Network → WS to see it.
      </p>
    </div>

    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      {SYMBOLS.map(symbol => (
        <PriceTickerCard key={symbol} symbol={symbol} />
      ))}
    </div>
  </div>
)
