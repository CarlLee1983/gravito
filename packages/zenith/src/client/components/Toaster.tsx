import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNotifications } from '../contexts/NotificationContext'
import { cn } from '../utils'

export function Toaster() {
  const { notifications, removeNotification } = useNotifications()
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const now = Date.now()
    // Check for new notifications to add to display
    notifications.forEach((n) => {
      if (!n.read && now - n.timestamp < 5000 && !activeIds.has(n.id)) {
        setActiveIds((prev) => new Set(prev).add(n.id))

        // Set timer to remove this specific ID
        setTimeout(() => {
          setActiveIds((prev) => {
            const next = new Set(prev)
            next.delete(n.id)
            return next
          })
        }, 5000)
      }
    })
  }, [notifications, activeIds])

  const visibleNotifications = notifications.filter((n) => activeIds.has(n.id))

  return (
    <div className="fixed bottom-8 right-8 z-[2000] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      <AnimatePresence mode="popLayout">
        {visibleNotifications.map((n) => (
          <motion.div
            key={n.id}
            layout
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            className={cn(
              'pointer-events-auto group relative flex items-start gap-4 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all',
              n.type === 'success' && 'bg-green-500/10 border-green-500/20 text-green-500',
              n.type === 'error' && 'bg-red-500/10 border-red-500/20 text-red-500',
              n.type === 'warning' && 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500',
              n.type === 'info' && 'bg-primary/10 border-primary/20 text-primary'
            )}
          >
            <div className="flex-shrink-0 mt-0.5">
              {n.type === 'success' && <CheckCircle2 size={18} />}
              {n.type === 'error' && <AlertCircle size={18} />}
              {n.type === 'warning' && <AlertCircle size={18} />}
              {n.type === 'info' && <Info size={18} />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-black tracking-tight leading-none mb-1">{n.title}</h4>
              <p className="text-xs font-medium opacity-80 leading-relaxed break-words">
                {n.message}
              </p>
              {n.source && (
                <span className="inline-block mt-2 px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-black uppercase tracking-widest">
                  {n.source}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeNotification(n.id)}
              className="mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded-lg"
            >
              <X size={14} />
            </button>
            <div className="absolute left-0 bottom-0 h-1 bg-current opacity-20 animate-toast-progress origin-left" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
