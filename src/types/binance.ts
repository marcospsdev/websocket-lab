/**
 * Raw payload shapes exactly as Binance sends them over the wire.
 * Kept separate from the "normalized" types below so a UI component never has to know
 * about Binance's (very abbreviated) field names like `c`, `s`, `q`.
 */

export type RawTickerEvent = {
  e: '24hrTicker'
  s: string // symbol
  c: string // last price
  o: string // open price
  h: string // high price
  l: string // low price
  v: string // base asset volume
  P: string // price change percent
}

export type RawTradeEvent = {
  e: 'trade'
  s: string // symbol
  t: number // trade id
  p: string // price
  q: string // quantity
  T: number // trade time (ms epoch)
  m: boolean // true if the buyer is the market maker (i.e. a "sell" from the taker's perspective)
}

export type RawKlineEvent = {
  e: 'kline'
  s: string // symbol
  k: {
    t: number // kline open time
    T: number // kline close time
    i: string // interval, e.g. "1m"
    o: string // open price
    c: string // close price
    h: string // high price
    l: string // low price
    v: string // base asset volume
    x: boolean // is this kline closed/final?
  }
}

/** Every combined-stream message from Binance arrives wrapped like this. */
export type RawStreamMessage = {
  stream: string
  data: RawTickerEvent | RawTradeEvent | RawKlineEvent
}

// ---- Normalized, UI-friendly types -----------------------------------------------------

export type Ticker = {
  symbol: string
  lastPrice: number
  openPrice: number
  highPrice: number
  lowPrice: number
  volume: number
  changePercent: number
}

export type Trade = {
  id: number
  symbol: string
  price: number
  quantity: number
  time: number
  side: 'buy' | 'sell'
}

export type Kline = {
  symbol: string
  interval: string
  openTime: number
  closeTime: number
  open: number
  close: number
  high: number
  low: number
  volume: number
  isFinal: boolean
}

export const normalizeTicker = (raw: RawTickerEvent): Ticker => ({
  symbol: raw.s,
  lastPrice: Number(raw.c),
  openPrice: Number(raw.o),
  highPrice: Number(raw.h),
  lowPrice: Number(raw.l),
  volume: Number(raw.v),
  changePercent: Number(raw.P),
})

export const normalizeTrade = (raw: RawTradeEvent): Trade => ({
  id: raw.t,
  symbol: raw.s,
  price: Number(raw.p),
  quantity: Number(raw.q),
  time: raw.T,
  // `m: true` means the buyer was the maker, i.e. this trade was triggered by a market sell.
  side: raw.m ? 'sell' : 'buy',
})

export const normalizeKline = (raw: RawKlineEvent): Kline => ({
  symbol: raw.s,
  interval: raw.k.i,
  openTime: raw.k.t,
  closeTime: raw.k.T,
  open: Number(raw.k.o),
  close: Number(raw.k.c),
  high: Number(raw.k.h),
  low: Number(raw.k.l),
  volume: Number(raw.k.v),
  isFinal: raw.k.x,
})
