import { createRippleClient } from '@gravito/ripple-client'
import { useEffect, useState } from 'react'

export interface LogData {
  rocketId: string
  text: string
  timestamp: number
}

export interface StatsData {
  rocketId: string
  cpu: string
  memory: string
  timestamp: number
}

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

    const start = async () => {
      try {
        await client.connect()
        setConnected(true)
        console.log('[Telemetry] Ripple Connected')

        // 2. 訂閱 'telemetry' 頻道並監聽事件
        // 在 Ripple 中，通常事件名稱是類別名或自定義名
        // 根據我們後端的實作: core.ripple.publish('telemetry', { type, data })
        // Ripple 的廣播通常會包裝成事件。
        client.channel('telemetry').listen('telemetry.data', (payload: any) => {
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
        setConnected(false)
      }
    }

    start()

    return () => {
      client.disconnect()
    }
  }, [url])

  return { logs, stats, connected }
}
