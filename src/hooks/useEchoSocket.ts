import { useEffect, useRef, useState } from 'react'
import { WebSocketClient, type ConnectionStatus } from '@/services/websocket'

const ECHO_WS_URL = 'wss://ws.postman-echo.com/raw'

export type EchoLogEntry = {
  id: number
  direction: 'sent' | 'received'
  text: string
  time: number
}

/**
 * Every other hook in this app only *consumes* a stream. This one demonstrates the other
 * direction: the client pushing data. It reuses `WebSocketClient` exactly as-is — `send()` was
 * already there, just never exercised from the UI before, because Binance only ever gets
 * SUBSCRIBE/UNSUBSCRIBE frames from `binanceSocket`, never user-authored payloads.
 *
 * Points at Postman's public echo service instead of Binance: it replies with exactly whatever
 * JSON object you send it, which makes it a safe sandbox for "what does sending over WS even
 * look like" without needing a backend of our own.
 */
export const useEchoSocket = () => {
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [log, setLog] = useState<EchoLogEntry[]>([])
  const clientRef = useRef<WebSocketClient | null>(null)
  const nextId = useRef(0)

  useEffect(() => {
    const client = new WebSocketClient({
      url: ECHO_WS_URL,
      onMessage: payload => {
        const text = typeof payload === 'object' && payload && 'text' in payload ? String((payload as { text: unknown }).text) : JSON.stringify(payload)
        setLog(prev => [...prev, { id: nextId.current++, direction: 'received', text, time: Date.now() }])
      },
    })
    clientRef.current = client
    const unsubscribe = client.onStatusChange(setStatus)
    client.connect()

    return () => {
      unsubscribe()
      client.disconnect()
      clientRef.current = null
    }
  }, [])

  const send = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || !clientRef.current) return

    clientRef.current.send({ text: trimmed })
    setLog(prev => [...prev, { id: nextId.current++, direction: 'sent', text: trimmed, time: Date.now() }])
  }

  return { status, log, send }
}
