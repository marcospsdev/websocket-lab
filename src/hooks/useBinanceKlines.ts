import { useEffect, useMemo, useState } from 'react'
import { buildStreamName, type KlineInterval } from '@/endpoints'
import { binanceSocket } from '@/services/websocket'
import type { ConnectionStatus } from '@/services/websocket'
import { normalizeKline, type Kline, type RawKlineEvent } from '@/types/binance'

const MAX_KLINES_KEPT = 30

/**
 * Rolling candlestick (kline) history for one symbol/interval. Binance streams an update for the
 * *currently forming* candle on every trade, then marks it `isFinal: true` once it closes and
 * starts streaming the next one — so we upsert by `openTime` instead of blindly appending, or
 * the in-progress candle would duplicate itself dozens of times per minute.
 */
export const useBinanceKlines = (symbol: string, interval: KlineInterval) => {
  const streamName = useMemo(() => buildStreamName('kline', symbol, interval), [symbol, interval])
  const [klines, setKlines] = useState<Kline[]>([])
  const [status, setStatus] = useState<ConnectionStatus>(binanceSocket.getStatus())

  useEffect(() => {
    setKlines([])

    const unsubscribeMessages = binanceSocket.subscribe(streamName, payload => {
      const kline = normalizeKline(payload as RawKlineEvent)
      setKlines(prev => {
        const withoutCurrentCandle = prev.filter(k => k.openTime !== kline.openTime)
        return [kline, ...withoutCurrentCandle].slice(0, MAX_KLINES_KEPT)
      })
    })
    const unsubscribeStatus = binanceSocket.onStatusChange(setStatus)

    return () => {
      unsubscribeMessages()
      unsubscribeStatus()
    }
  }, [streamName])

  return { klines, status }
}
