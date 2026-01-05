import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  Clock,
  Database,
  ExternalLink,
  Info,
  Monitor,
  Moon,
  Palette,
  RefreshCcw,
  Server,
  Shield,
  Sun,
  Trash2,
} from 'lucide-react'
import React from 'react'
import { cn } from '../utils'

export function SettingsPage() {
  const queryClient = useQueryClient()
  const [showAddRule, setShowAddRule] = React.useState(false)
  const [theme, setTheme] = React.useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme')
      if (stored === 'light' || stored === 'dark') {
        return stored
      }
    }
    return 'system'
  })

  const { data: systemStatus } = useQuery<any>({
    queryKey: ['system-status'],
    queryFn: () => fetch('/api/system/status').then((res) => res.json()),
    refetchInterval: 30000,
  })

  const { data: alertConfig } = useQuery<any>({
    queryKey: ['alerts-config'],
    queryFn: () => fetch('/api/alerts/config').then((res) => res.json()),
  })

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    const root = window.document.documentElement

    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
      localStorage.removeItem('theme')
    } else if (newTheme === 'dark') {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black tracking-tighter">Settings</h1>
        <p className="text-muted-foreground mt-2 text-sm font-bold opacity-60 uppercase tracking-widest">
          Configure your Flux Console preferences.
        </p>
      </div>

      {/* Appearance Section */}
      <section className="card-premium p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Palette size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold">Appearance</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              Customize the look and feel
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="theme-select" className="text-sm font-bold mb-3 block">
              Theme
            </label>
            <div id="theme-select" className="flex gap-3">
              {[
                { value: 'light', icon: Sun, label: 'Light' },
                { value: 'dark', icon: Moon, label: 'Dark' },
                { value: 'system', icon: Monitor, label: 'System' },
              ].map(({ value, icon: Icon, label }) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => handleThemeChange(value as 'light' | 'dark' | 'system')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all',
                    theme === value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/40 border-border/50 hover:border-primary/30'
                  )}
                >
                  <Icon size={18} />
                  <span className="font-bold text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Connection Info Section */}
      <section className="card-premium p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <Database size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold">Connection Status</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              Redis and system connectivity
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border/30">
            <div className="flex items-center gap-3">
              <Server size={16} className="text-muted-foreground" />
              <span className="font-medium">Redis Connection</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-sm font-bold text-green-500">Connected</span>
            </div>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border/30">
            <div className="flex items-center gap-3">
              <Database size={16} className="text-muted-foreground" />
              <span className="font-medium">Redis URL</span>
            </div>
            <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
              {systemStatus?.redisUrl || 'redis://localhost:6379'}
            </code>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border/30">
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-muted-foreground" />
              <span className="font-medium">Service Uptime</span>
            </div>
            <span className="text-sm font-mono font-bold">
              {systemStatus?.uptime ? formatUptime(systemStatus.uptime) : 'Loading...'}
            </span>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <RefreshCcw size={16} className="text-muted-foreground" />
              <span className="font-medium">Engine Version</span>
            </div>
            <span className="text-sm font-bold">{systemStatus?.engine || 'Loading...'}</span>
          </div>
        </div>
      </section>

      {/* System Info Section */}
      <section className="card-premium p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
            <Info size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold">System Information</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              Runtime and memory details
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/20 rounded-xl p-4">
            <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest mb-1">
              Node.js Version
            </p>
            <p className="text-lg font-mono font-bold">{systemStatus?.node || '...'}</p>
          </div>
          <div className="bg-muted/20 rounded-xl p-4">
            <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest mb-1">
              Environment
            </p>
            <p className="text-lg font-mono font-bold">{systemStatus?.env || '...'}</p>
          </div>
          <div className="bg-muted/20 rounded-xl p-4">
            <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest mb-1">
              Memory (RSS)
            </p>
            <p className="text-lg font-mono font-bold">{systemStatus?.memory?.rss || '...'}</p>
          </div>
          <div className="bg-muted/20 rounded-xl p-4">
            <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest mb-1">
              Heap Used
            </p>
            <p className="text-lg font-mono font-bold">{systemStatus?.memory?.heapUsed || '...'}</p>
          </div>
          <div className="bg-muted/20 rounded-xl p-4">
            <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest mb-1">
              Total System RAM
            </p>
            <p className="text-lg font-mono font-bold">{systemStatus?.memory?.total || '...'}</p>
          </div>
        </div>
      </section>

      {/* Alerting Section */}
      <section className="card-premium p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
            <Bell size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold">Alerting & Notifications</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              System health and failure monitoring
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Notification Channels */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 mb-2">
              Notification Channels
            </h3>

            {/* Slack */}
            <div className="p-4 bg-muted/20 rounded-xl border border-border/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#4A154B]/10 flex items-center justify-center text-[#4A154B] dark:text-[#E01E5A]">
                    <Bell size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Slack</h4>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                      Standard notification webhook
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const enabled = !alertConfig?.config?.channels?.slack?.enabled
                    const current = alertConfig?.config?.channels?.slack || {}
                    await fetch('/api/alerts/config', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        ...alertConfig.config,
                        channels: {
                          ...alertConfig.config.channels,
                          slack: { ...current, enabled },
                        },
                      }),
                    })
                    queryClient.invalidateQueries({ queryKey: ['alerts-config'] })
                  }}
                  className={cn(
                    'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all',
                    alertConfig?.config?.channels?.slack?.enabled
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                      : 'bg-muted-foreground/20 text-muted-foreground'
                  )}
                >
                  {alertConfig?.config?.channels?.slack?.enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              <div className="flex gap-3">
                <input
                  type="password"
                  placeholder="https://hooks.slack.com/services/..."
                  defaultValue={alertConfig?.config?.channels?.slack?.webhookUrl || ''}
                  onBlur={async (e) => {
                    const val = e.target.value
                    if (val === alertConfig?.config?.channels?.slack?.webhookUrl) {
                      return
                    }
                    await fetch('/api/alerts/config', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        ...alertConfig.config,
                        channels: {
                          ...alertConfig.config.channels,
                          slack: {
                            ...alertConfig?.config?.channels?.slack,
                            webhookUrl: val,
                          },
                        },
                      }),
                    })
                    queryClient.invalidateQueries({ queryKey: ['alerts-config'] })
                  }}
                  className="flex-1 bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
            </div>

            {/* Discord */}
            <div className="p-4 bg-muted/20 rounded-xl border border-border/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#5865F2]/10 flex items-center justify-center text-[#5865F2]">
                    <Monitor size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Discord</h4>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                      Webhook integration for servers
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const enabled = !alertConfig?.config?.channels?.discord?.enabled
                    const current = alertConfig?.config?.channels?.discord || {}
                    await fetch('/api/alerts/config', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        ...alertConfig.config,
                        channels: {
                          ...alertConfig.config.channels,
                          discord: { ...current, enabled },
                        },
                      }),
                    })
                    queryClient.invalidateQueries({ queryKey: ['alerts-config'] })
                  }}
                  className={cn(
                    'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all',
                    alertConfig?.config?.channels?.discord?.enabled
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                      : 'bg-muted-foreground/20 text-muted-foreground'
                  )}
                >
                  {alertConfig?.config?.channels?.discord?.enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              <div className="flex gap-3">
                <input
                  type="password"
                  placeholder="https://discord.com/api/webhooks/..."
                  defaultValue={alertConfig?.config?.channels?.discord?.webhookUrl || ''}
                  onBlur={async (e) => {
                    const val = e.target.value
                    if (val === alertConfig?.config?.channels?.discord?.webhookUrl) {
                      return
                    }
                    await fetch('/api/alerts/config', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        ...alertConfig.config,
                        channels: {
                          ...alertConfig.config.channels,
                          discord: {
                            ...alertConfig?.config?.channels?.discord,
                            webhookUrl: val,
                          },
                        },
                      }),
                    })
                    queryClient.invalidateQueries({ queryKey: ['alerts-config'] })
                  }}
                  className="flex-1 bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
            </div>

            {/* Email (SMTP) */}
            <div className="p-4 bg-muted/20 rounded-xl border border-border/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                    <Info size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Email (SMTP)</h4>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                      Standard mail delivery
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const enabled = !alertConfig?.config?.channels?.email?.enabled
                    const current = alertConfig?.config?.channels?.email || {}
                    await fetch('/api/alerts/config', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        ...alertConfig.config,
                        channels: {
                          ...alertConfig.config.channels,
                          email: { ...current, enabled },
                        },
                      }),
                    })
                    queryClient.invalidateQueries({ queryKey: ['alerts-config'] })
                  }}
                  className={cn(
                    'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all',
                    alertConfig?.config?.channels?.email?.enabled
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                      : 'bg-muted-foreground/20 text-muted-foreground'
                  )}
                >
                  {alertConfig?.config?.channels?.email?.enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {alertConfig?.config?.channels?.email?.enabled && (
                <div className="grid grid-cols-2 gap-3 mt-4 animate-in fade-in slide-in-from-top-2">
                  <div className="col-span-2 space-y-1">
                    <label
                      htmlFor="email-to"
                      className="text-[9px] font-black uppercase text-muted-foreground/60"
                    >
                      Destination Address
                    </label>
                    <input
                      id="email-to"
                      placeholder="admin@example.com"
                      defaultValue={alertConfig?.config?.channels?.email?.to || ''}
                      onBlur={async (e) => {
                        const val = e.target.value
                        await fetch('/api/alerts/config', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            ...alertConfig.config,
                            channels: {
                              ...alertConfig.config.channels,
                              email: {
                                ...alertConfig?.config?.channels?.email,
                                to: val,
                              },
                            },
                          }),
                        })
                      }}
                      className="w-full bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="smtp-host"
                      className="text-[9px] font-black uppercase text-muted-foreground/60"
                    >
                      SMTP Host
                    </label>
                    <input
                      id="smtp-host"
                      placeholder="smtp.gmail.com"
                      defaultValue={alertConfig?.config?.channels?.email?.smtpHost || ''}
                      onBlur={async (e) => {
                        await fetch('/api/alerts/config', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            ...alertConfig.config,
                            channels: {
                              ...alertConfig.config.channels,
                              email: {
                                ...alertConfig?.config?.channels?.email,
                                smtpHost: e.target.value,
                              },
                            },
                          }),
                        })
                      }}
                      className="w-full bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="smtp-port"
                      className="text-[9px] font-black uppercase text-muted-foreground/60"
                    >
                      Port
                    </label>
                    <input
                      id="smtp-port"
                      type="number"
                      placeholder="465"
                      defaultValue={alertConfig?.config?.channels?.email?.smtpPort || 465}
                      onBlur={async (e) => {
                        await fetch('/api/alerts/config', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            ...alertConfig.config,
                            channels: {
                              ...alertConfig.config.channels,
                              email: {
                                ...alertConfig?.config?.channels?.email,
                                smtpPort: parseInt(e.target.value, 10),
                              },
                            },
                          }),
                        })
                      }}
                      className="w-full bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="smtp-user"
                      className="text-[9px] font-black uppercase text-muted-foreground/60"
                    >
                      Username
                    </label>
                    <input
                      id="smtp-user"
                      placeholder="user@example.com"
                      defaultValue={alertConfig?.config?.channels?.email?.smtpUser || ''}
                      onBlur={async (e) => {
                        await fetch('/api/alerts/config', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            ...alertConfig.config,
                            channels: {
                              ...alertConfig.config.channels,
                              email: {
                                ...alertConfig?.config?.channels?.email,
                                smtpUser: e.target.value,
                              },
                            },
                          }),
                        })
                      }}
                      className="w-full bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="smtp-pass"
                      className="text-[9px] font-black uppercase text-muted-foreground/60"
                    >
                      Password
                    </label>
                    <input
                      id="smtp-pass"
                      type="password"
                      placeholder="••••••••"
                      defaultValue={alertConfig?.config?.channels?.email?.smtpPass || ''}
                      onBlur={async (e) => {
                        await fetch('/api/alerts/config', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            ...alertConfig.config,
                            channels: {
                              ...alertConfig.config.channels,
                              email: {
                                ...alertConfig?.config?.channels?.email,
                                smtpPass: e.target.value,
                              },
                            },
                          }),
                        })
                      }}
                      className="w-full bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label
                      htmlFor="email-from"
                      className="text-[9px] font-black uppercase text-muted-foreground/60"
                    >
                      From Address
                    </label>
                    <input
                      id="email-from"
                      placeholder="Zenith Monitor <noreply@example.com>"
                      defaultValue={alertConfig?.config?.channels?.email?.from || ''}
                      onBlur={async (e) => {
                        await fetch('/api/alerts/config', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            ...alertConfig.config,
                            channels: {
                              ...alertConfig.config.channels,
                              email: {
                                ...alertConfig?.config?.channels?.email,
                                from: e.target.value,
                              },
                            },
                          }),
                        })
                      }}
                      className="w-full bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mb-3 mt-8">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">
              Active Rules
            </h3>
            <button
              type="button"
              onClick={() => setShowAddRule(!showAddRule)}
              className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline border-none bg-transparent cursor-pointer"
            >
              {showAddRule ? 'Cancel' : '+ Add Rule'}
            </button>
          </div>

          {showAddRule && (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const rule = {
                  id: Math.random().toString(36).substring(7),
                  name: formData.get('name'),
                  type: formData.get('type'),
                  threshold: parseInt(formData.get('threshold') as string, 10),
                  cooldownMinutes: parseInt(formData.get('cooldown') as string, 10),
                  queue: formData.get('queue') || undefined,
                }
                await fetch('/api/alerts/rules', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(rule),
                })
                setShowAddRule(false)
                queryClient.invalidateQueries({ queryKey: ['alerts-config'] })
              }}
              className="p-4 bg-muted/40 rounded-xl border border-primary/20 space-y-4 mb-6"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label
                    htmlFor="rule-name"
                    className="text-[10px] font-black uppercase text-muted-foreground"
                  >
                    Rule Name
                  </label>
                  <input
                    id="rule-name"
                    name="name"
                    required
                    placeholder="High CPU"
                    className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="rule-type"
                    className="text-[10px] font-black uppercase text-muted-foreground"
                  >
                    Type
                  </label>
                  <select
                    id="rule-type"
                    name="type"
                    className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm outline-none cursor-pointer"
                  >
                    <option value="backlog">Queue Backlog</option>
                    <option value="failure">High Failure Count</option>
                    <option value="worker_lost">Worker Loss</option>
                    <option value="node_cpu">Node CPU (%)</option>
                    <option value="node_ram">Node RAM (%)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label
                    htmlFor="rule-threshold"
                    className="text-[10px] font-black uppercase text-muted-foreground"
                  >
                    Threshold
                  </label>
                  <input
                    id="rule-threshold"
                    name="threshold"
                    type="number"
                    required
                    defaultValue="80"
                    className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="rule-cooldown"
                    className="text-[10px] font-black uppercase text-muted-foreground"
                  >
                    Cooldown (Min)
                  </label>
                  <input
                    id="rule-cooldown"
                    name="cooldown"
                    type="number"
                    required
                    defaultValue="30"
                    className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="rule-queue"
                    className="text-[10px] font-black uppercase text-muted-foreground"
                  >
                    Queue (Optional)
                  </label>
                  <input
                    id="rule-queue"
                    name="queue"
                    placeholder="default"
                    className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 cursor-pointer"
              >
                Save Alert Rule
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {alertConfig?.rules?.map((rule: any) => (
              <div
                key={rule.id}
                className="p-3 bg-muted/20 border border-border/10 rounded-xl flex items-center justify-between group"
              >
                <div className="flex-1">
                  <p className="text-[11px] font-black uppercase tracking-tight flex items-center gap-2">
                    {rule.name}
                    {rule.queue && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        {rule.queue}
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground opacity-70">
                    {rule.type === 'backlog'
                      ? `Waiting > ${rule.threshold}`
                      : rule.type === 'failure'
                        ? `Failed > ${rule.threshold}`
                        : rule.type === 'worker_lost'
                          ? `Workers < ${rule.threshold}`
                          : rule.type === 'node_cpu'
                            ? `CPU > ${rule.threshold}%`
                            : `RAM > ${rule.threshold}%`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-2 py-0.5 bg-muted rounded text-[9px] font-bold text-muted-foreground">
                    {rule.cooldownMinutes}m
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm('Delete this alert rule?')) {
                        await fetch(`/api/alerts/rules/${rule.id}`, { method: 'DELETE' })
                        queryClient.invalidateQueries({ queryKey: ['alerts-config'] })
                      }
                    }}
                    className="p-1 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/30">
            <p className="text-xs text-muted-foreground max-w-md">
              Configure notification channels above to receive real-time alerts.
            </p>
            <button
              type="button"
              onClick={async () => {
                const res = await fetch('/api/alerts/test', { method: 'POST' }).then((r) =>
                  r.json()
                )
                if (res.success) {
                  alert('Test alert dispatched to all enabled channels.')
                }
              }}
              className="w-full sm:w-auto px-4 py-2 border border-primary/20 hover:bg-primary/5 text-primary rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary/10 cursor-pointer"
            >
              Test Dispatch Now
            </button>
          </div>
        </div>
      </section>

      {/* Data Retention Section */}
      <section className="card-premium p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
            <Trash2 size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold">Data Retention</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              Manage persistent archive storage
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between py-3 border-b border-border/30">
              <div>
                <h3 className="text-sm font-bold">SQL Job Archive Preservation</h3>
                <p className="text-xs text-muted-foreground">
                  Keep archived jobs for a specific number of days before permanent removal.
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase text-muted-foreground/40">
                    Auto-Cleanup
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      const enabled = !alertConfig?.maintenance?.autoCleanup
                      await fetch('/api/maintenance/config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          ...alertConfig.maintenance,
                          autoCleanup: enabled,
                        }),
                      })
                      queryClient.invalidateQueries({ queryKey: ['alerts-config'] })
                    }}
                    className={cn(
                      'w-10 h-5 rounded-full p-1 transition-all flex items-center',
                      alertConfig?.maintenance?.autoCleanup
                        ? 'bg-green-500 justify-end'
                        : 'bg-muted justify-start'
                    )}
                  >
                    <div className="w-3 h-3 bg-white rounded-full shadow-sm" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase text-muted-foreground/40">
                    Retention Days
                  </span>
                  <select
                    className="bg-muted border border-border/50 rounded-lg px-3 py-1.5 text-sm font-bold outline-none focus:ring-1 focus:ring-primary/30 transition-all cursor-pointer"
                    value={alertConfig?.maintenance?.retentionDays || 30}
                    onChange={async (e) => {
                      const days = parseInt(e.target.value, 10)
                      await fetch('/api/maintenance/config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          ...alertConfig.maintenance,
                          retentionDays: days,
                        }),
                      })
                      queryClient.invalidateQueries({ queryKey: ['alerts-config'] })
                    }}
                  >
                    <option value="7">7 Days</option>
                    <option value="15">15 Days</option>
                    <option value="30">30 Days</option>
                    <option value="90">90 Days</option>
                    <option value="365">1 Year</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Info size={16} className="text-red-500/60" />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-red-900/60 dark:text-red-400/60">
                    Manual prune will remove all jobs older than the selected period.
                  </span>
                  {alertConfig?.maintenance?.lastRun && (
                    <span className="text-[10px] text-muted-foreground/60">
                      Last auto-cleanup run:{' '}
                      {new Date(alertConfig.maintenance.lastRun).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const days = alertConfig?.maintenance?.retentionDays || 30
                  if (confirm(`Are you sure you want to prune logs older than ${days} days?`)) {
                    const res = await fetch('/api/maintenance/cleanup-archive', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ days }),
                    }).then((r) => r.json())
                    alert(`Cleanup complete. Removed ${res.deleted || 0} archived jobs.`)
                  }
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-red-500/20"
              >
                Prune Archive Now
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-border/30">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold">Live Stats History (Redis)</h3>
                <p className="text-xs text-muted-foreground">
                  Minute-by-minute metrics used for dashboard charts.
                </p>
              </div>
              <div className="px-3 py-1 bg-muted rounded-full text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Auto-Prunes (60m)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="card-premium p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Shield size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold">About Flux Console</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              Version and documentation
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border/30">
            <span className="font-medium">Version</span>
            <span className="text-sm font-bold">{systemStatus?.version || '0.1.0-alpha.1'}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border/30">
            <span className="font-medium">Package</span>
            <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
              {systemStatus?.package || '@gravito/flux-console'}
            </code>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="font-medium">Documentation</span>
            <a
              href="https://github.com/gravito-framework/gravito"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary hover:underline font-bold"
            >
              View Docs <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m ${Math.floor(seconds % 60)}s`
}
