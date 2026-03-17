import { createRippleClient } from '@gravito/ripple-client'
import { useEffect, useState } from 'react'

/**
 * Represents a log entry received via telemetry.
 *
 * @public
 * @since 3.0.0
 */
export interface LogData {
  /** The unique ID of the rocket container. */
  rocketId: string
  /** The raw log message text. */
  text: string
  /** Epoch timestamp in milliseconds. */
  timestamp: number
}

/**
 * Represents resource utilization statistics received via telemetry.
 *
 * @public
 * @since 3.0.0
 */
export interface StatsData {
  /** The unique ID of the rocket container. */
  rocketId: string
  /** Percentage of CPU utilization as a string. */
  cpu: string
  /** Memory utilization string (e.g., '120MB'). */
  memory: string
  /** Epoch timestamp in milliseconds. */
  timestamp: number
}

/**
 * A React hook for subscribing to real-time telemetry data from Launchpad.
 *
 * It uses `RippleClient` to connect to the WebSocket server and listens for
 * 'telemetry.data' events on the 'telemetry' channel.
 *
 * @param url - The WebSocket server URL. @default 'ws://localhost:4000/ws'
 * @returns An object containing logs, stats, and connection status.
 *
 * @public
 * @since 3.0.0
 */
export function useTelemetry(url = 'ws://localhost:4000/ws') {
  const [logs, setLogs] = useState<LogData[]>([])
  const [stats, setStats] = useState<Record<string, StatsData>>({})
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    // 修正：依照 RippleClient 規範
    // 1. 注意 URL 通常會加上 /ws (後端 RippleOrbit 預設路徑)
    const client = createRippleClient({
      host: url,
      // 客戶端需要手動調用 connect()，不需要 autoConnect 屬性
    })
    let disposed = false

    const start = async () => {
      try {
        await client.connect()
        if (disposed) {
          client.disconnect()
          return
        }
        setConnected(true)
        console.log('[Telemetry] Ripple Connected')

        // 2. 訂閱 'telemetry' 頻道並監聽事件
        // 在 Ripple 中，通常事件名稱是類別名或自定義名
        // 根據我們後端的實作: core.ripple.publish('telemetry', { type, data })
        // Ripple 的廣播通常會包裝成事件。
        client.channel('telemetry').listen('telemetry.data', (payload: any) => {
          if (disposed) {
            return
          }
          const { type, data } = payload
          const timestamp = Date.now()

          if (type === 'log') {
            setLogs((prev) => [...prev.slice(-99), { ...data, timestamp }])
          } else if (type === 'stats') {
            setStats((prev) => ({
              ...prev,
              [data.rocketId]: { ...data, timestamp },
            }))
          }
        })
      } catch (err) {
        console.error('[Telemetry] Connection failed', err)
        if (!disposed) {
          setConnected(false)
        }
      }
    }

    start()

    return () => {
      disposed = true
      client.disconnect()
    }
  }, [url])

  return { logs, stats, connected }
}
