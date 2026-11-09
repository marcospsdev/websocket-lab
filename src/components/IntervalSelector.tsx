import { KLINE_INTERVALS, type KlineInterval } from '@/endpoints'

type IntervalSelectorProps = {
  value: KlineInterval
  onChange: (interval: KlineInterval) => void
}

export const IntervalSelector = ({ value, onChange }: IntervalSelectorProps) => (
  <div className='inline-flex rounded-lg border border-white/10 bg-white/5 p-1'>
    {KLINE_INTERVALS.map(interval => (
      <button
        key={interval}
        type='button'
        onClick={() => onChange(interval)}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          value === interval ? 'bg-emerald-500 text-black' : 'text-slate-300 hover:bg-white/10'
        }`}
      >
        {interval}
      </button>
    ))}
  </div>
)
