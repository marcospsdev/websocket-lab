/**
 * Generic, reconnecting, protocol-agnostic WebSocket wrapper. This is the WS equivalent of
 * `httpClient.ts` (the shared axios instance) of a typical REST app: it knows nothing about
 * Binance specifically — connecting, reconnecting with backoff, and moving raw JSON in and out is
 * ALL it does. Domain knowledge (stream names, subscribe/unsubscribe framing, message routing)
 * lives one layer up, in `binanceSocket.ts`, the same way `authService.ts` builds on `httpClient`.
 */

export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed'

type WebSocketClientOptions = {
  url: string
  onMessage: (payload: unknown) => void
  /** Base delay before the first reconnect attempt; doubles on every subsequent failure. */
  baseReconnectDelayMs?: number
  maxReconnectDelayMs?: number
}

export class WebSocketClient {
  private socket: WebSocket | null = null
  private status: ConnectionStatus = 'idle'
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private manuallyClosed = false
  private readonly statusListeners = new Set<(status: ConnectionStatus) => void>()

  private readonly url: string
  private readonly onMessage: (payload: unknown) => void
  private readonly baseReconnectDelayMs: number
  private readonly maxReconnectDelayMs: number

  constructor(options: WebSocketClientOptions) {
    this.url = options.url
    this.onMessage = options.onMessage
    this.baseReconnectDelayMs = options.baseReconnectDelayMs ?? 1000
    this.maxReconnectDelayMs = options.maxReconnectDelayMs ?? 30000
  }

  connect() {
    this.manuallyClosed = false
    this.openSocket()
  }

  disconnect() {
    this.manuallyClosed = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.socket?.close()
    this.socket = null
    this.setStatus('closed')
  }

  /** Sends a JSON-serializable object. No-ops (and warns) if the socket isn't open yet. */
  send(data: object) {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocketClient] tried to send while not connected, dropping message:', data)
      return
    }
    this.socket.send(JSON.stringify(data))
  }

  getStatus() {
    return this.status
  }

  /** Returns an unsubscribe function, mirroring the pattern used by the app's React hooks. */
  onStatusChange(listener: (status: ConnectionStatus) => void) {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status
    this.statusListeners.forEach(listener => listener(status))
  }

  private openSocket() {
    this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting')

    const socket = new WebSocket(this.url)
    this.socket = socket

    socket.onopen = () => {
      this.reconnectAttempts = 0
      this.setStatus('open')
    }

    socket.onmessage = event => {
      try {
        this.onMessage(JSON.parse(event.data))
      } catch (error) {
        console.error('[WebSocketClient] failed to parse incoming message', error)
      }
    }

    socket.onerror = event => {
      // A deliberate disconnect() can abort a socket that's still mid-handshake — the browser
      // fires error/close for that on its own, which is expected noise, not a real failure.
      if (this.manuallyClosed) return
      console.error('[WebSocketClient] socket error', event)
    }

    socket.onclose = () => {
      this.socket = null
      if (this.manuallyClosed) {
        this.setStatus('closed')
        return
      }
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    const delay = Math.min(this.baseReconnectDelayMs * 2 ** this.reconnectAttempts, this.maxReconnectDelayMs)
    this.reconnectAttempts += 1
    this.setStatus('reconnecting')
    this.reconnectTimer = setTimeout(() => this.openSocket(), delay)
  }
}
