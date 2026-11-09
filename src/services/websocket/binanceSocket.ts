import { BINANCE_WS_BASE_URL } from '@/endpoints'
import type { RawStreamMessage } from '@/types/binance'
import { WebSocketClient, type ConnectionStatus } from './WebSocketClient'

type StreamHandler = (data: RawStreamMessage['data']) => void

/**
 * Domain-specific singleton built on top of `WebSocketClient` — this is the direct equivalent of
 * the exported `httpClient` axios instance: every hook in the app imports THIS ONE object instead
 * of opening its own connection, exactly like every `services/*.ts` function reuses the same
 * `httpClient` instead of creating its own axios client.
 *
 * It keeps a single physical connection open (Binance's combined-stream endpoint) and multiplexes
 * as many logical stream subscriptions as the UI needs over it, using Binance's SUBSCRIBE /
 * UNSUBSCRIBE JSON-RPC framing to add/remove streams without reconnecting.
 */
class BinanceSocket {
  private client: WebSocketClient | null = null
  private readonly handlersByStream = new Map<string, Set<StreamHandler>>()
  private readonly statusListeners = new Set<(status: ConnectionStatus) => void>()
  private requestId = 1
  private closeTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * Subscribes to a Binance stream (e.g. "btcusdt@trade"). Multiple callers can subscribe to the
   * same stream — Binance only gets ONE subscribe request either way. Returns an unsubscribe
   * function; call it on cleanup (React effect teardown).
   */
  subscribe(streamName: string, handler: StreamHandler): () => void {
    // A subscribe arriving right after the last one dropped to zero (fast symbol/page switch,
    // or React StrictMode's mount→unmount→remount dance) cancels the pending teardown below
    // instead of forcing a full disconnect+reconnect for no real reason.
    if (this.closeTimer) {
      clearTimeout(this.closeTimer)
      this.closeTimer = null
    }

    const isFirstSubscriberForStream = !this.handlersByStream.has(streamName)
    if (isFirstSubscriberForStream) this.handlersByStream.set(streamName, new Set())
    this.handlersByStream.get(streamName)!.add(handler)

    if (!this.client) {
      this.openConnection(streamName)
    } else if (isFirstSubscriberForStream) {
      this.sendFrame('SUBSCRIBE', [streamName])
    }

    return () => this.unsubscribe(streamName, handler)
  }

  onStatusChange(listener: (status: ConnectionStatus) => void) {
    this.statusListeners.add(listener)
    if (this.client) listener(this.client.getStatus())
    return () => this.statusListeners.delete(listener)
  }

  getStatus(): ConnectionStatus {
    return this.client?.getStatus() ?? 'idle'
  }

  private unsubscribe(streamName: string, handler: StreamHandler) {
    const handlers = this.handlersByStream.get(streamName)
    if (!handlers) return

    handlers.delete(handler)
    if (handlers.size > 0) return

    this.handlersByStream.delete(streamName)

    if (this.handlersByStream.size > 0) {
      this.sendFrame('UNSUBSCRIBE', [streamName])
      return
    }

    // Nothing left subscribed. Don't tear the connection down immediately — give a brief grace
    // period in case something resubscribes right away (see the comment in `subscribe`). No need
    // to send UNSUBSCRIBE for this last stream either: if the grace period expires, the whole
    // socket closes anyway, which drops every subscription with it.
    this.closeTimer = setTimeout(() => this.closeConnection(), 300)
  }

  private openConnection(firstStreamName: string) {
    // Binance's combined-stream endpoint needs at least one stream in the query string to accept
    // the connection; anything subscribed afterwards is added dynamically via SUBSCRIBE frames.
    const url = `${BINANCE_WS_BASE_URL}?streams=${firstStreamName}`

    const client = new WebSocketClient({
      url,
      onMessage: payload => this.handleMessage(payload as RawStreamMessage),
    })
    this.client = client

    client.onStatusChange(status => {
      // A client that already got replaced/discarded can still fire a late status event
      // asynchronously (e.g. its close handshake finishing after we've moved on to a new
      // connection). Ignore anything that isn't coming from the CURRENTLY active client, or a
      // stale "closed" can overwrite a perfectly healthy "open" from the new one.
      if (this.client !== client) return

      this.statusListeners.forEach(listener => listener(status))
      // Binance forgets subscriptions on reconnect — re-subscribe everything we still care about.
      if (status === 'open') this.resubscribeAll()
    })

    client.connect()
  }

  private closeConnection() {
    this.closeTimer = null
    this.client?.disconnect()
    this.client = null
  }

  private resubscribeAll() {
    const streams = Array.from(this.handlersByStream.keys())
    if (streams.length > 0) this.sendFrame('SUBSCRIBE', streams)
  }

  private sendFrame(method: 'SUBSCRIBE' | 'UNSUBSCRIBE', params: string[]) {
    this.client?.send({ method, params, id: this.requestId++ })
  }

  private handleMessage(message: RawStreamMessage) {
    if (!message?.stream) return
    this.handlersByStream.get(message.stream)?.forEach(handler => handler(message.data))
  }
}

/** The one and only Binance socket instance for the whole app — import this, never `new BinanceSocket()`. */
export const binanceSocket = new BinanceSocket()
