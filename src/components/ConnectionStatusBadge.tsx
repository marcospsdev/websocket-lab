import type { ConnectionStatus } from '@/services/websocket'

const STYLES: Record<ConnectionStatus, { label: string; dot: string; text: string }> = {
  idle: { label: 'Idle', dot: 'bg-slate-500', text: 'text-slate-400' },
  connecting: { label: 'Connecting…', dot: 'bg-amber-400 animate-pulse', text: 'text-amber-300' },
  open: { label: 'Live', dot: 'bg-emerald-400 animate-pulse', text: 'text-emerald-300' },
  reconnecting: { label: 'Reconnecting…', dot: 'bg-amber-400 animate-pulse', text: 'text-amber-300' },
  closed: { label: 'Disconnected', dot: 'bg-red-500', text: 'text-red-400' },
}

type ConnectionStatusBadgeProps = {
  status: ConnectionStatus
}

export const ConnectionStatusBadge = ({ status }: ConnectionStatusBadgeProps) => {
  const style = STYLES[status]

  return (
    <span className='inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium'>
      <span className={`h-2 w-2 rounded-full ${style.dot}`} />
      <span className={style.text}>{style.label}</span>
    </span>
  )
}
