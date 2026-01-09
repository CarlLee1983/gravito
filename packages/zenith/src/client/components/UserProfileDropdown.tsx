import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, ChevronRight, Clock, LogOut, Server, Settings, Shield, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function UserProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const { isAuthEnabled, logout } = useAuth()
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data: systemStatus } = useQuery<any>({
    queryKey: ['system-status'],
    queryFn: () => fetch('/api/system/status').then((res) => res.json()),
    refetchInterval: 30000,
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleLogout = async () => {
    await logout()
    setIsOpen(false)
  }

  const handleNavigate = (path: string) => {
    navigate(path)
    setIsOpen(false)
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        type="button"
        className="flex items-center gap-3 cursor-pointer group outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="text-right hidden sm:block">
          <p className="text-sm font-black tracking-tight group-hover:text-primary transition-colors">
            Admin User
          </p>
          <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">
            Architect
          </p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-primary-foreground font-black shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
          <User size={20} />
        </div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-72 bg-card border rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            {/* User Info Header */}
            <div className="p-5 bg-gradient-to-br from-primary/10 to-indigo-500/10 border-b">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-primary-foreground shadow-lg">
                  <User size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Admin User</h3>
                  <p className="text-xs text-muted-foreground">System Administrator</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Shield size={10} className="text-green-500" />
                    <span className="text-[9px] font-bold text-green-500 uppercase tracking-widest">
                      Full Access
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="p-4 bg-muted/20 border-b">
              <p className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest mb-3">
                System Status
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Activity size={12} className="text-green-500" />
                  <span className="text-[10px] font-bold">Online</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-muted-foreground" />
                  <span className="text-[10px] font-bold">
                    {systemStatus?.uptime ? formatUptime(systemStatus.uptime) : '...'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Server size={12} className="text-muted-foreground" />
                  <span className="text-[10px] font-bold">{systemStatus?.node || '...'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 text-[10px] font-black">🔥</span>
                  <span className="text-[10px] font-bold">
                    {systemStatus?.memory?.rss || '...'}
                  </span>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              <button
                type="button"
                onClick={() => handleNavigate('/settings')}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Settings
                    size={18}
                    className="text-muted-foreground group-hover:text-foreground transition-colors"
                  />
                  <span className="text-sm font-semibold">Settings</span>
                </div>
                <ChevronRight size={16} className="text-muted-foreground/50" />
              </button>

              {isAuthEnabled && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-red-500/10 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <LogOut size={18} className="text-red-500" />
                    <span className="text-sm font-semibold text-red-500">Logout</span>
                  </div>
                </button>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-muted/10 border-t">
              <p className="text-[9px] text-center text-muted-foreground/50">
                Flux Console v0.1.0-alpha.1
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
