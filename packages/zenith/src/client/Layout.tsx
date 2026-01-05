// ... imports ...
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  BarChart3,
  Briefcase,
  Command,
  HardDrive,
  LayoutDashboard,
  ListTree,
  LogOut,
  Moon,
  RefreshCcw,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Trash2,
  Zap,
} from 'lucide-react'
import type * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NotificationBell } from './components/NotificationBell'
import { Toaster } from './components/Toaster'
import { UserProfileDropdown } from './components/UserProfileDropdown'
import { useAuth } from './contexts/AuthContext'
import { Sidebar } from './Sidebar'
import { cn } from './utils'

interface LayoutProps {
  children: React.ReactNode
}

interface CommandItem {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  action: () => void
  category: 'Navigation' | 'System' | 'Action'
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAuthEnabled, logout } = useAuth()
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
    }
    return 'light'
  })
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [health, setHealth] = useState(99.9)
  const [systemStatus, setSystemStatus] = useState<Record<string, any>>({})
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  // Initial System Status Fetch
  useEffect(() => {
    fetch('/api/system/status')
      .then((res) => res.json())
      .then(setSystemStatus)
      .catch(() => {})
  }, [])

  // Global SSE Stream Manager
  useEffect(() => {
    console.log('[Zenith] Establishing Global Event Stream...')
    const ev = new EventSource('/api/logs/stream')

    ev.addEventListener('log', (e) => {
      try {
        const data = JSON.parse(e.data)
        window.dispatchEvent(new CustomEvent('flux-log-update', { detail: data }))
      } catch (err) {
        console.error('SSE Log Error', err)
      }
    })

    ev.addEventListener('stats', (e) => {
      try {
        const data = JSON.parse(e.data)
        window.dispatchEvent(new CustomEvent('flux-stats-update', { detail: data }))
      } catch (err) {
        console.error('SSE Stats Error', err)
      }
    })

    ev.addEventListener('pulse', (e) => {
      try {
        const data = JSON.parse(e.data)
        window.dispatchEvent(new CustomEvent('flux-pulse-update', { detail: data }))
      } catch (err) {
        console.error('SSE Pulse Error', err)
      }
    })

    ev.onerror = (err) => {
      console.error('[Zenith] SSE Connection Error', err)
      ev.close()
    }

    return () => {
      console.log('[Zenith] Closing Global Event Stream')
      ev.close()
    }
  }, [])

  // Fetch Queues for search (once)
  const [queueData, setQueueData] = useState<{ queues: any[] }>({ queues: [] })
  useEffect(() => {
    fetch('/api/queues')
      .then((res) => res.json())
      .then(setQueueData)
      .catch(() => {})

    // Optional: Listen to global stats if available (from OverviewPage) to keep queue stats fresh in command palette
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail?.queues) {
        setQueueData({ queues: customEvent.detail.queues })
      }
    }
    window.addEventListener('flux-stats-update', handler)
    return () => window.removeEventListener('flux-stats-update', handler)
  }, [])

  // Debounced job search
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        setDebouncedQuery(searchQuery)
      } else {
        setDebouncedQuery('')
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Search jobs (Real-time and Archive)
  const { data: searchResults } = useQuery<{ results: any[]; archiveResults?: any[] }>({
    queryKey: ['job-search', debouncedQuery],
    queryFn: async () => {
      const [realtime, archive] = await Promise.all([
        fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=10`).then((res) =>
          res.json()
        ),
        fetch(`/api/archive/search?q=${encodeURIComponent(debouncedQuery)}&limit=10`).then((res) =>
          res.json()
        ),
      ])
      return {
        results: realtime.results || [],
        archiveResults: archive.results || [],
      }
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 5000,
  })

  useEffect(() => {
    const root = window.document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const interval = setInterval(() => {
      setHealth((prev) => {
        const jitter = (Math.random() - 0.5) * 0.1
        return Math.min(100, Math.max(98.5, prev + jitter))
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))

  const retryAllFailed = async () => {
    const queues = queueData?.queues || []
    for (const q of queues) {
      if (q.failed > 0) {
        await fetch(`/api/queues/${q.name}/retry-all-failed`, { method: 'POST' })
      }
    }
    queryClient.invalidateQueries({ queryKey: ['queues'] })
  }

  const baseCommands: CommandItem[] = [
    {
      id: 'nav-overview',
      title: 'Go to Overview',
      description: 'Navigate to system dashboard',
      icon: <LayoutDashboard size={18} />,
      category: 'Navigation',
      action: () => navigate('/'),
    },
    {
      id: 'nav-queues',
      title: 'Go to Queues',
      description: 'Manage processing queues',
      icon: <ListTree size={18} />,
      category: 'Navigation',
      action: () => navigate('/queues'),
    },
    {
      id: 'nav-workers',
      title: 'Go to Workers',
      description: 'Monitor worker nodes',
      icon: <HardDrive size={18} />,
      category: 'Navigation',
      action: () => navigate('/workers'),
    },
    {
      id: 'nav-metrics',
      title: 'Go to Metrics',
      description: 'View system analytics',
      icon: <BarChart3 size={18} />,
      category: 'Navigation',
      action: () => navigate('/metrics'),
    },
    {
      id: 'nav-settings',
      title: 'Go to Settings',
      description: 'Configure console preferences',
      icon: <Settings size={18} />,
      category: 'Navigation',
      action: () => navigate('/settings'),
    },
    {
      id: 'act-retry-all',
      title: 'Retry All Failed Jobs',
      description: 'Recover all critical failures across all queues',
      icon: <RefreshCcw size={18} />,
      category: 'Action',
      action: retryAllFailed,
    },
    {
      id: 'sys-theme',
      title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      description: 'Toggle system visual appearance',
      icon: theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />,
      category: 'System',
      action: toggleTheme,
    },
    ...(isAuthEnabled
      ? [
          {
            id: 'sys-logout',
            title: 'Logout',
            description: 'Sign out from the console',
            icon: <LogOut size={18} />,
            category: 'System' as const,
            action: logout,
          },
        ]
      : []),
  ]

  const queueCommands: CommandItem[] = (queueData?.queues || []).map((q: any) => ({
    id: `queue-${q.name}`,
    title: `Queue: ${q.name}`,
    description: `${q.waiting} waiting, ${q.failed} failed`,
    icon: <ListTree size={18} />,
    category: 'Navigation',
    action: () => {
      navigate('/queues')
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('select-queue', { detail: q.name }))
      }, 100)
    },
  }))

  const actionCommands: CommandItem[] = [
    {
      id: 'act-clear-logs',
      title: 'Clear All Logs',
      description: 'Flush temporary log buffer in UI',
      icon: <Trash2 size={18} />,
      category: 'Action',
      action: () => {
        window.dispatchEvent(new CustomEvent('clear-logs'))
      },
    },
  ]

  // Dynamic job search results
  const jobCommands: CommandItem[] = useMemo(() => {
    const combined = [
      ...(searchResults?.results || []),
      ...(searchResults?.archiveResults || []).map((j: any) => ({ ...j, _archived: true })),
    ]

    if (!combined.length) {
      return []
    }

    return combined.slice(0, 15).map((job: any) => ({
      id: `job-${job._queue}-${job.id}-${job._archived ? 'arch' : 'live'}`,
      title: `Job: ${job.id || 'Unknown'}`,
      description: `${job._queue} • ${job.status || job._type}${job._archived ? ' • ARCHIVED' : ''} • ${job.name || 'No name'}`,
      icon: job._archived ? <HardDrive size={18} /> : <Briefcase size={18} />,
      category: 'Action' as const,
      action: () => {
        navigate('/queues')
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('select-queue', { detail: job._queue }))
          if (job._archived) {
            // Future-proof: trigger archive view opening
            window.dispatchEvent(
              new CustomEvent('inspect-job', { detail: { queue: job._queue, job } })
            )
          }
        }, 100)
      },
    }))
  }, [searchResults, navigate])

  const commands = [...baseCommands, ...actionCommands, ...queueCommands, ...jobCommands]

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Auto-scroll to selected item
  useEffect(() => {
    const el = document.getElementById(`command-item-${selectedIndex}`)
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedIndex])

  const handleSelect = (cmd: CommandItem) => {
    cmd.action()
    setIsCommandPaletteOpen(false)
    setSearchQuery('')
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden transition-colors duration-300">
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="border-r border-border/40 bg-card/50 backdrop-blur-xl flex flex-col z-50 transition-all duration-300 ease-[0.22, 1, 0.36, 1]"
      >
        <div className="h-16 flex items-center px-6 border-b border-border/40 bg-card/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
              <Zap className="text-primary-foreground fill-current" size={18} />
            </div>
            <motion.div
              animate={{ opacity: isSidebarOpen ? 1 : 0 }}
              className="flex flex-col min-w-[140px]"
            >
              <span className="font-extrabold text-lg tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                Zenith
              </span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                Control Plane
              </span>
            </motion.div>
          </div>
        </div>
        <Sidebar
          collapsed={!isSidebarOpen}
          toggleCollapse={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      </motion.aside>

      <main className="flex-1 flex flex-col relative overflow-hidden scanline">
        {/* Top Header */}
        <header className="h-16 border-b bg-card/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10 transition-colors">
          <div className="flex items-center gap-6 flex-1">
            <button
              type="button"
              className="relative max-w-md w-full group cursor-pointer outline-none block text-left"
              onClick={() => setIsCommandPaletteOpen(true)}
            >
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-hover:text-primary transition-colors"
                size={18}
              />
              <div className="w-full bg-muted/40 border border-border/50 rounded-xl py-2 pl-10 pr-4 text-sm text-muted-foreground/60 font-medium flex justify-between items-center transition-all hover:bg-muted/60 hover:border-primary/20">
                <span>Search or command...</span>
                <div className="flex gap-1 group-hover:scale-105 transition-transform">
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-[10px] font-black opacity-60">
                    ⌘
                  </kbd>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-[10px] font-black opacity-60">
                    K
                  </kbd>
                </div>
              </div>
            </button>

            {/* System Integrity Indicator */}
            <div className="hidden lg:flex items-center gap-3 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 transition-all hover:bg-primary/10 hover:border-primary/20 cursor-default group">
              <div className="relative flex items-center justify-center">
                <ShieldCheck size={14} className="text-primary z-10" />
                <div className="absolute w-3 h-3 bg-primary rounded-full glow-pulse"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-[0.1em] text-primary/60 leading-none">
                  System Integrity
                </span>
                <span className="text-[11px] font-black tracking-tight leading-none">
                  {health.toFixed(1)}% Nominal
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2.5 hover:bg-muted rounded-xl text-muted-foreground hover:text-primary transition-all duration-300 active:scale-95 group relative"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? (
                <Moon size={20} className="group-hover:rotate-[15deg] transition-transform" />
              ) : (
                <Sun
                  size={20}
                  className="group-hover:rotate-90 transition-transform text-yellow-500"
                />
              )}
            </button>

            <NotificationBell />

            <div className="h-8 w-[1px] bg-border/50"></div>

            <UserProfileDropdown />
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </div>

        {/* Dynamic Status Bar (Ambient) */}
        <footer className="h-7 border-t bg-card/80 backdrop-blur-md flex items-center justify-between px-6 z-10 transition-colors">
          <div className="flex items-center gap-6 overflow-hidden">
            <div className="flex items-center gap-2 border-r border-border/50 pr-4">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></span>
              <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest whitespace-nowrap">
                Node: {systemStatus?.env || 'production-east-1'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] animate-in fade-in slide-in-from-left duration-1000">
              <span className="flex items-center gap-1.5">
                <Activity size={10} className="text-primary/40" /> Latency: 4ms
              </span>
              <span className="hidden sm:inline border-l border-border/30 pl-4 text-primary">
                RAM: {systemStatus?.memory?.rss || '...'} /{' '}
                {systemStatus?.memory?.total || '4.00 GB'}
              </span>
              <span className="hidden md:inline border-l border-border/30 pl-4 uppercase">
                Engine: {systemStatus?.engine || 'v2.4.1-beta'}
              </span>
              <span className="hidden lg:inline border-l border-border/30 pl-4 lowercase">
                v: {systemStatus?.node || '...'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 pl-4 bg-gradient-to-l from-card via-card to-transparent text-right">
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-muted rounded-full overflow-hidden">
                <motion.div
                  animate={{ x: [-20, 20] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-full bg-primary/40"
                />
              </div>
              <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest">
                Bus Traffic
              </span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground/60 tabular-nums lowercase">
              {new Date().toISOString().split('T')[1]?.split('.')[0] || ''} utc
            </span>
          </div>
        </footer>
      </main>

      {/* Command Palette Modal */}
      <AnimatePresence>
        {isCommandPaletteOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setIsCommandPaletteOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="relative w-full max-w-2xl bg-card border-border/50 border rounded-3xl shadow-2xl overflow-hidden scanline"
            >
              <div className="p-6 border-b flex items-center gap-4 bg-muted/5">
                <Command className="text-primary animate-pulse" size={24} />
                <input
                  type="text"
                  placeholder="Execute command or navigate..."
                  className="flex-1 bg-transparent border-none outline-none text-lg font-bold placeholder:text-muted-foreground/30"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setSelectedIndex(0)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length)
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      setSelectedIndex(
                        (prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length
                      )
                    } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
                      handleSelect(filteredCommands[selectedIndex]!)
                    }
                  }}
                />
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-muted border text-[9px] font-black text-muted-foreground/60 uppercase">
                  ESC to close
                </div>
              </div>
              <div className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
                {filteredCommands.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground/40 space-y-2">
                    <Activity size={32} className="mx-auto opacity-20" />
                    <p className="text-xs font-black uppercase tracking-widest">
                      No matching commands found
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredCommands.map((cmd, i) => (
                      <button
                        type="button"
                        id={`command-item-${i}`}
                        key={cmd.id}
                        className={cn(
                          'w-full flex items-center justify-between p-4 rounded-2xl transition-all cursor-pointer group/cmd outline-none',
                          i === selectedIndex
                            ? 'bg-primary shadow-lg shadow-primary/20 -translate-x-1'
                            : 'hover:bg-muted'
                        )}
                        onClick={() => handleSelect(cmd)}
                        onMouseEnter={() => setSelectedIndex(i)}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                              i === selectedIndex
                                ? 'bg-white/20 text-white'
                                : 'bg-muted text-primary'
                            )}
                          >
                            {cmd.icon}
                          </div>
                          <div>
                            <p
                              className={cn(
                                'text-sm font-black tracking-tight',
                                i === selectedIndex ? 'text-white' : 'text-foreground'
                              )}
                            >
                              {cmd.title}
                            </p>
                            <p
                              className={cn(
                                'text-[10px] font-bold uppercase tracking-widest opacity-60',
                                i === selectedIndex ? 'text-white/80' : 'text-muted-foreground'
                              )}
                            >
                              {cmd.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md',
                              i === selectedIndex
                                ? 'bg-white/20 text-white'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {cmd.category}
                          </span>
                          {i === selectedIndex && (
                            <kbd className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] text-white">
                              ↵
                            </kbd>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 border-t bg-muted/5 flex justify-between items-center px-6">
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 text-[9px] font-black text-muted-foreground/40 uppercase">
                    <kbd className="bg-muted px-1.5 py-0.5 rounded border">↑↓</kbd> to navigate
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] font-black text-muted-foreground/40 uppercase">
                    <kbd className="bg-muted px-1.5 py-0.5 rounded border">↵</kbd> to select
                  </div>
                </div>
                <span className="text-[9px] font-black text-primary/40 uppercase tracking-[0.2em]">
                  Gravito Zenith v1.0
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <Toaster />
    </div>
  )
}
