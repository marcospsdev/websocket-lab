import { SYMBOLS, type Symbol } from '@/endpoints'

type SymbolSelectorProps = {
  value: Symbol
  onChange: (symbol: Symbol) => void
}

export const SymbolSelector = ({ value, onChange }: SymbolSelectorProps) => (
  <div className='inline-flex rounded-lg border border-white/10 bg-white/5 p-1'>
    {SYMBOLS.map(symbol => (
      <button
        key={symbol}
        type='button'
        onClick={() => onChange(symbol)}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          value === symbol ? 'bg-emerald-500 text-black' : 'text-slate-300 hover:bg-white/10'
        }`}
      >
        {symbol}
      </button>
    ))}
  </div>
)
