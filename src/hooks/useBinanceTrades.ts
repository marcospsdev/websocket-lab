import { useEffect, useMemo, useState } from 'react'
import { buildStreamName } from '@/endpoints'
import { binanceSocket } from '@/services/websocket'
import type { ConnectionStatus } from '@/services/websocket'
import { normalizeTrade, type RawTradeEvent, type Trade } from '@/types/binance'

const MAX_TRADES_KEPT = 40

/**
 * Live trade tape for one symbol. Unlike `useBinanceTicker` (which only ever cares about the
 * latest message), a trade feed needs to accumulate a rolling window of messages — so this hook
 * subscribes directly via `binanceSocket` instead of going through `useWebSocketStream`, which
 * only keeps the single most recent payload.
 */
export const useBinanceTrades = (symbol: string) => {
  const streamName = useMemo(() => buildStreamName('trade', symbol), [symbol])
  const [trades, setTrades] = useState<Trade[]>([])
  const [status, setStatus] = useState<ConnectionStatus>(binanceSocket.getStatus())

  useEffect(() => {
    setTrades([])

    const unsubscribeMessages = binanceSocket.subscribe(streamName, payload => {
      const trade = normalizeTrade(payload as RawTradeEvent)
      setTrades(prev => [trade, ...prev].slice(0, MAX_TRADES_KEPT))
    })
    const unsubscribeStatus = binanceSocket.onStatusChange(setStatus)

    return () => {
      unsubscribeMessages()
      unsubscribeStatus()
    }
  }, [streamName])

  return { trades, status }
}
