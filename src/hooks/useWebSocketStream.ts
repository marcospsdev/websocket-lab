import { useEffect, useRef, useState } from 'react'
import { binanceSocket } from '@/services/websocket'
import type { ConnectionStatus } from '@/services/websocket'
import type { RawStreamMessage } from '@/types/binance'

/**
 * Generic building block every domain hook (`useBinanceTicker`, `useBinanceTrades`, ...) is built
 * on top of — the WS equivalent of `useApi.ts`. Where `useApi` exposes
 * `{ data, loading, error, makeRequest }` for a one-shot HTTP call, this exposes
 * `{ data, status, messageCount }` for an ongoing stream: `data` is simply whatever the last
 * message was, updated every time a new one arrives.
 *
 * `streamName` is expected in Binance's own format, e.g. "btcusdt@trade" — build it with
 * `buildStreamName()` from `@/endpoints`. Pass `null` to stay unsubscribed (e.g. while the user
 * hasn't picked a symbol yet).
 */
export const useWebSocketStream = <T = RawStreamMessage['data']>(streamName: string | null) => {
  const [data, setData] = useState<T | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>(binanceSocket.getStatus())
  const [messageCount, setMessageCount] = useState(0)

  const messageCountRef = useRef(0)

  useEffect(() => {
    if (!streamName) return

    const unsubscribeMessages = binanceSocket.subscribe(streamName, payload => {
      setData(payload as T)
      messageCountRef.current += 1
      setMessageCount(messageCountRef.current)
    })
    const unsubscribeStatus = binanceSocket.onStatusChange(setStatus)

    return () => {
      unsubscribeMessages()
      unsubscribeStatus()
    }
  }, [streamName])

  return { data, status, messageCount }
}
