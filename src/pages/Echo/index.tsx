import { useEchoSocket } from '@/hooks/useEchoSocket'
import { ConnectionStatusBadge } from '@/components/ConnectionStatusBadge'
import { EchoConsole } from '@/components/EchoConsole'

export const Echo = () => {
  const { status, log, send } = useEchoSocket()

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h1 className='text-xl font-bold text-white'>Echo lab — client → server</h1>
          <p className='max-w-2xl text-sm text-slate-400'>
            Every other screen in this app only <em>consumes</em> a stream. This one sends data too: each message
            you type goes out through the exact same <code className='text-slate-300'>WebSocketClient.send()</code>{' '}
            the app already uses internally for Binance's SUBSCRIBE/UNSUBSCRIBE frames — just pointed at a public
            echo server (<code className='text-slate-300'>wss://ws.postman-echo.com/raw</code>) that replies with
            exactly what it receives, instead of Binance market data.
          </p>
        </div>
        <ConnectionStatusBadge status={status} />
      </div>

      <EchoConsole log={log} onSend={send} disabled={status !== 'open'} />

      <p className='text-xs text-slate-500'>
        Open DevTools → Network → WS while you type: each send shows up as an outgoing frame, and the reply comes
        back as an incoming one on the same connection — no HTTP request involved anywhere in this exchange.
      </p>
    </div>
  )
}
