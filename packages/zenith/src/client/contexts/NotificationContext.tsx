import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react'

/**
 * Represents a system notification in the Zenith dashboard.
 *
 * @public
 * @since 3.0.0
 */
export interface Notification {
  /** Unique notification ID. */
  id: string
  /** The severity type of the notification. */
  type: 'info' | 'success' | 'warning' | 'error'
  /** Short title for the notification. */
  title: string
  /** Detailed notification message. */
  message: string
  /** Epoch timestamp when the notification was created. */
  timestamp: number
  /** Whether the notification has been read by the user. */
  read: boolean
  /** Optional source identifier (e.g., a queue name). */
  source?: string
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void
  removeNotification: (id: string) => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

/**
 * React hook to access the notification system.
 *
 * @public
 * @since 3.0.0
 */
export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: ReactNode
}

/**
 * Provider component for managing global notifications in Zenith.
 *
 * @public
 * @since 3.0.0
 */
export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const unreadCount = notifications.filter((n) => !n.read).length

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      const newNotification: Notification = {
        ...notification,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        read: false,
      }
      setNotifications((prev) => [newNotification, ...prev].slice(0, 50)) // Keep max 50 notifications
    },
    []
  )

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  // Listen to the global log update event dispatched by Layout's SSE stream
  useEffect(() => {
    const handler = (e: any) => {
      const log = e.detail
      if (log.level === 'error' || log.level === 'warn') {
        addNotification({
          type: log.level === 'error' ? 'error' : 'warning',
          title: log.level === 'error' ? 'Job Failed' : 'Warning',
          message: log.message || 'An event occurred',
          source: log.queue || log.source,
        })
      }
    }
    window.addEventListener('flux-log-update', handler)
    return () => window.removeEventListener('flux-log-update', handler)
  }, [addNotification])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        removeNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}
