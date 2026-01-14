import { AnimatePresence, motion } from 'framer-motion'
import React, { useEffect, useState } from 'react'

const LOG_MESSAGES = [
  'Job accepted: 0x42FA',
  'Queue [emails] worker active',
  'Sitemap re-index complete',
  'DLQ check: 0 failed',
  'Worker #42 heartbeat: OK',
  'Redis latency: 0.4ms',
  'Pipeline flux stabilized',
  'Telemetry data synced',
]

export function LogTicker() {
  const [logs, setLogs] = useState<string[]>([])

  useEffect(() => {
    const interval = setInterval(() => {
      const newLog = LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)]
      const timestamp = new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      setLogs((prev) => [`[${timestamp}] ${newLog}`, ...prev].slice(0, 5))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed bottom-8 left-8 z-50 pointer-events-none hidden lg:block">
      <div className="flex flex-col gap-1.5">
        <AnimatePresence mode="popLayout">
          {logs.map((log, i) => (
            <motion.div
              key={log + i}
              initial={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
              animate={{ opacity: 1 - i * 0.2, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
              className="font-mono text-[9px] text-zenith-accent/60 bg-black/20 backdrop-blur-sm px-2 py-1 rounded border border-white/5"
            >
              {log}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
