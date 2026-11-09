import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { EchoLogEntry } from '@/hooks/useEchoSocket'
import { formatTime } from '@/utils/formatters'

type EchoConsoleProps = {
  log: EchoLogEntry[]
  onSend: (text: string) => void
  disabled: boolean
}

export const EchoConsole = ({ log, onSend, disabled }: EchoConsoleProps) => {
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [log.length])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSend(draft)
    setDraft('')
  }

  return (
    <div className='flex flex-col gap-4'>
      <form onSubmit={handleSubmit} className='flex gap-2'>
        <input
          value={draft}
          onChange={event => setDraft(event.target.value)}
          placeholder={disabled ? 'Connecting…' : 'Type a message to send over the socket…'}
          disabled={disabled}
          className='flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-50'
        />
        <button
          type='submit'
          disabled={disabled || !draft.trim()}
          className='rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-40'
        >
          Send
        </button>
      </form>

      <div className='flex h-80 flex-col gap-2 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03] p-4'>
        {log.length === 0 && <p className='m-auto text-sm text-slate-500'>Nothing sent yet.</p>}

        {log.map(entry => (
          <div key={entry.id} className={`flex text-sm ${entry.direction === 'sent' ? 'justify-end' : 'justify-start'}`}>
            <span
              className={`max-w-[75%] rounded-lg px-3 py-1.5 ${
                entry.direction === 'sent' ? 'bg-sky-500/20 text-sky-200' : 'bg-emerald-500/20 text-emerald-200'
              }`}
            >
              <span className='mr-2 text-[10px] font-semibold uppercase tracking-wide opacity-60'>
                {entry.direction === 'sent' ? '→ sent' : '← echoed back'}
              </span>
              {entry.text}
              <span className='ml-2 text-[10px] opacity-50'>{formatTime(entry.time)}</span>
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
