import { useMemo } from 'react'
import { buildStreamName } from '@/endpoints'
import { normalizeTicker, type RawTickerEvent, type Ticker } from '@/types/binance'
import { useWebSocketStream } from './useWebSocketStream'

/** Live 24h ticker (price + change%) for one symbol, e.g. useBinanceTicker('BTCUSDT'). */
export const useBinanceTicker = (symbol: string) => {
  const streamName = useMemo(() => buildStreamName('ticker', symbol), [symbol])
  const { data, status } = useWebSocketStream<RawTickerEvent>(streamName)

  const ticker: Ticker | null = data ? normalizeTicker(data) : null

  return { ticker, status }
}
