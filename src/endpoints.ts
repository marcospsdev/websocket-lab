/**
 * Registry of every WebSocket "endpoint" this app talks to — the WS equivalent of the
 * `endpoints.ts` registry of a typical REST app. There, an entry maps a logical name to an
 * HTTP method + route; here it maps a logical name to a Binance *stream name template*.
 *
 * Nothing in here opens a connection — it only describes what streams exist and how to build
 * their names. The actual connection lives in `services/websocket/binanceSocket.ts`.
 */

export type WsStreamKind = 'ticker' | 'trade' | 'kline'

type WsEndpointDefinition = {
  name: WsStreamKind
  /** Binance stream name template. `{symbol}` and `{interval}` are filled in at request time. */
  template: string
  description: string
}

export const wsEndpoints: WsEndpointDefinition[] = [
  { name: 'ticker', template: '{symbol}@ticker', description: 'Rolling 24h price/volume stats for one symbol.' },
  { name: 'trade', template: '{symbol}@trade', description: 'Every individual trade executed for one symbol.' },
  { name: 'kline', template: '{symbol}@kline_{interval}', description: 'Candlestick (OHLC) updates for one symbol/interval.' },
]

export const BINANCE_WS_BASE_URL = 'wss://stream.binance.com:9443/stream'

/** Builds the lowercase stream name Binance expects, e.g. buildStreamName('trade', 'BTCUSDT') -> 'btcusdt@trade'. */
export const buildStreamName = (kind: WsStreamKind, symbol: string, interval?: string): string => {
  const endpoint = wsEndpoints.find(e => e.name === kind)
  if (!endpoint) throw new Error(`Unknown WS endpoint kind: ${kind}`)

  return endpoint.template
    .replace('{symbol}', symbol.toLowerCase())
    .replace('{interval}', interval ?? '1m')
}

export const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'] as const
export type Symbol = (typeof SYMBOLS)[number]

export const KLINE_INTERVALS = ['1m', '5m', '15m', '1h'] as const
export type KlineInterval = (typeof KLINE_INTERVALS)[number]
