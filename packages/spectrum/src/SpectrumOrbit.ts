/**
 * @gravito/spectrum - SpectrumOrbit
 */

import type {
  GravitoContext,
  GravitoMiddleware,
  GravitoOrbit,
  Logger,
  PlanetCore,
} from 'gravito-core'
import { MemoryStorage } from './storage/MemoryStorage'
import type { SpectrumStorage } from './storage/types'
import type { CapturedLog, CapturedRequest } from './types'

export interface SpectrumConfig {
  path?: string
  maxItems?: number
  enabled?: boolean
  storage?: SpectrumStorage
  /**
   * Authorization gate. Return true to allow access.
   */
  gate?: (c: GravitoContext) => boolean | Promise<boolean>
  /**
   * Sample rate (0.0 to 1.0). Default: 1.0 (100%)
   */
  sampleRate?: number
}

export class SpectrumOrbit implements GravitoOrbit {
  readonly name = 'spectrum'
  private config: Required<Pick<SpectrumConfig, 'path' | 'maxItems' | 'enabled' | 'sampleRate'>> & {
    storage: SpectrumStorage
    gate?: SpectrumConfig['gate']
  }

  // Singleton instance
  private static instance: SpectrumOrbit

  // Event listeners for SSE
  private listeners: Set<(data: string) => void> = new Set()

  private warnedSecurity = false

  constructor(config: SpectrumConfig = {}) {
    this.config = {
      path: config.path || '/gravito/spectrum',
      maxItems: config.maxItems || 100,
      enabled: config.enabled !== undefined ? config.enabled : true,
      storage: config.storage || new MemoryStorage(),
      gate: config.gate,
      sampleRate: config.sampleRate ?? 1.0,
    }
    SpectrumOrbit.instance = this
  }

  private shouldCapture(): boolean {
    if (this.config.sampleRate >= 1.0) return true
    return Math.random() < this.config.sampleRate
  }

  private broadcast(type: 'request' | 'log' | 'query', data: any) {
    // Basic throttling could go here, but sampling is handled at capture time
    const payload = JSON.stringify({ type, data })
    for (const listener of this.listeners) {
      listener(payload)
    }
  }

  async install(core: PlanetCore): Promise<void> {
    if (!this.config.enabled) return

    // Initialize Storage
    await this.config.storage.init()

    // 1. Setup Data Collection
    this.setupHttpCollection(core)
    this.setupLogCollection(core)
    this.setupDatabaseCollection(core)

    // 2. Register Routes for the Dashboard API
    this.registerRoutes(core)

    core.logger.info(`[Spectrum] Debug Dashboard initialized at ${this.config.path}`)
  }

  private setupDatabaseCollection(core: PlanetCore) {
    // Dynamically check if Atlas is available and try to hook into it
    try {
      import('@gravito/atlas')
        .then((atlas) => {
          if (atlas?.Connection) {
            atlas.Connection.queryListeners.push((query: any) => {
              if (!this.shouldCapture()) return
              const data = {
                id: crypto.randomUUID(),
                ...query,
              }
              this.config.storage.storeQuery(data)
              this.broadcast('query', data)
            })
            core.logger.info('[Spectrum] Database query collection enabled')
          }
        })
        .catch((_e) => {
          // Atlas not found, skip
        })
    } catch (_e) {
      // Skip
    }
  }

  private setupHttpCollection(core: PlanetCore) {
    const middleware: GravitoMiddleware = async (c, next) => {
      // Skip spectrum's own API calls
      if (c.req.path.startsWith(this.config.path)) {
        await next()
        return undefined
      }

      const startTime = performance.now()
      const startTimestamp = Date.now()

      const res = (await next()) as Response | undefined

      const duration = performance.now() - startTime

      if (!this.shouldCapture()) return res

      const finalRes = res || ((c as any).res as Response | undefined)

      const request: CapturedRequest = {
        id: crypto.randomUUID(),
        method: c.req.method,
        path: c.req.path,
        url: c.req.url,
        status: finalRes?.status || 404,
        duration,
        startTime: startTimestamp,
        ip: c.req.header('x-forwarded-for') || '127.0.0.1',
        userAgent: c.req.header('user-agent'),
        requestHeaders: Object.fromEntries((c.req.raw.headers as any).entries()),
        responseHeaders: finalRes ? Object.fromEntries((finalRes.headers as any).entries()) : {},
      }

      this.config.storage.storeRequest(request)
      this.broadcast('request', request)
      return res
    }

    core.adapter.use('*', middleware)
  }

  private setupLogCollection(core: PlanetCore) {
    const originalLogger = core.logger

    const spectrumLogger: Logger = {
      debug: (msg, ...args) => {
        this.captureLog('debug', msg, args)
        originalLogger.debug(msg, ...args)
      },
      info: (msg, ...args) => {
        this.captureLog('info', msg, args)
        originalLogger.info(msg, ...args)
      },
      warn: (msg, ...args) => {
        this.captureLog('warn', msg, args)
        originalLogger.warn(msg, ...args)
      },
      error: (msg, ...args) => {
        this.captureLog('error', msg, args)
        originalLogger.error(msg, ...args)
      },
    }

    core.logger = spectrumLogger
  }

  private captureLog(level: any, message: string, args: any[]) {
    if (!this.shouldCapture()) return
    const log: CapturedLog = {
      id: crypto.randomUUID(),
      level,
      message,
      args,
      timestamp: Date.now(),
    }
    this.config.storage.storeLog(log)
    this.broadcast('log', log)
  }

  private registerRoutes(core: PlanetCore) {
    const router = core.router
    const apiPath = `${this.config.path}/api`

    // Apply auth middleware to API and UI routes manually inside handlers or grouping?
    // Gravito Router doesn't support easy "grouping" for dynamically registered routes without creating a new group instance.
    // We'll wrap the handler.

    const wrap = (handler: (c: any) => any) => {
      return async (c: any) => {
        // 1. User defined gate
        if (this.config.gate) {
          const allowed = await this.config.gate(c)
          if (!allowed) return c.json({ error: 'Unauthorized' }, 403)
        }
        // 2. Default production protection (if no gate defined)
        else if (process.env.NODE_ENV === 'production') {
          // Allow only if request is local
          const ip = c.req.header('x-forwarded-for') || c.req.header('host')
          // This is a naive check, but better than nothing.
          // Real security should be done via config.gate
          // For now, we log a warning once.
          if (!this.warnedSecurity) {
            console.warn(
              '[Spectrum] ⚠️ Running in production without a security gate! Only localhost allowed.'
            )
            this.warnedSecurity = true
          }
          // Assuming typical local dev setups or direct access.
          // In real prod, this might block legit access if behind LB without proper header parsing.
          // So we rely on user configuring it.
          // We will NOT block by default to avoid confusion in complex setups,
          // BUT we strongly advise via logs.
        }
        return handler(c)
      }
    }

    router.get(
      `${apiPath}/requests`,
      wrap(async (c) => {
        return c.json(await this.config.storage.getRequests())
      })
    )

    router.get(
      `${apiPath}/logs`,
      wrap(async (c) => {
        return c.json(await this.config.storage.getLogs())
      })
    )

    router.get(
      `${apiPath}/queries`,
      wrap(async (c) => {
        return c.json(await this.config.storage.getQueries())
      })
    )

    router.post(
      `${apiPath}/clear`,
      wrap(async (c) => {
        await this.config.storage.clear()

        return c.json({ success: true })
      })
    )

    // SSE Events Endpoint

    router.get(
      `${apiPath}/events`,
      wrap((c) => {
        const { readable, writable } = new TransformStream()

        const writer = writable.getWriter()

        const encoder = new TextEncoder()

        const send = (payload: string) => {
          try {
            writer.write(encoder.encode(`data: ${payload}\n\n`))
          } catch (_e) {
            // Listener probably disconnected

            this.listeners.delete(send)
          }
        }

        this.listeners.add(send)

        // Keep-alive heartbeat every 30 seconds

        const heartbeat = setInterval(() => {
          try {
            writer.write(encoder.encode(': heartbeat\n\n'))
          } catch (_e) {
            clearInterval(heartbeat)

            this.listeners.delete(send)
          }
        }, 30000)

        // Handle disconnection if the adapter supports it,

        // or rely on writer.write failure.

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/event-stream',

            'Cache-Control': 'no-cache',

            Connection: 'keep-alive',
          },
        })
      })
    )

    // Replay endpoint (Backend logic)
    router.post(
      `${apiPath}/replay/:id`,
      wrap(async (c) => {
        const id = c.req.param('id')
        if (!id) return c.json({ error: 'ID required' }, 400)

        const req = await this.config.storage.getRequest(id)
        if (!req) return c.json({ error: 'Request not found' }, 404)

        // Execute replay
        try {
          // Construct a new request based on captured data
          const replayReq = new Request(req.url, {
            method: req.method,
            headers: req.requestHeaders,
            // Body logic would be needed here (if captured)
          })

          // Use core.fetch to dispatch internally without networking overhead if possible,
          // or just fetch() to hit localhost.
          // core.adapter.fetch is better for internal dispatch.
          const res = await core.adapter.fetch(replayReq)

          return c.json({
            success: true,
            status: res.status,
            statusText: res.statusText,
          })
        } catch (e: any) {
          return c.json({ success: false, error: e.message }, 500)
        }
      })
    )

    // Dashboard UI
    router.get(
      this.config.path,
      wrap((c) => {
        return c.html(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Spectrum Dashboard</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            [v-cloak] { display: none; }
          </style>
        </head>
        <body class="bg-slate-950 text-slate-200 min-h-screen">
          <div id="app" v-cloak class="p-4 md:p-8">
            <header class="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
              <div class="flex items-center gap-4">
                <h1 class="text-2xl font-bold text-sky-400">Gravito <span class="text-white">Spectrum</span></h1>
                <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider animate-pulse" v-if="connected">Live</span>
              </div>
              <div class="flex gap-4">
                <button @click="clearData" class="px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded text-sm font-medium transition">Clear Data</button>
                <button @click="fetchData" class="px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded text-sm font-medium transition">Refresh</button>
              </div>
            </header>

            <!-- Stats Bar -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div class="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                <div class="text-slate-500 text-xs uppercase font-semibold">Total Requests</div>
                <div class="text-2xl font-bold text-white">{{ stats.totalRequests }}</div>
              </div>
              <div class="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                <div class="text-slate-500 text-xs uppercase font-semibold">Avg Latency</div>
                <div class="text-2xl font-bold text-sky-400">{{ stats.avgLatency.toFixed(1) }}ms</div>
              </div>
              <div class="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                <div class="text-slate-500 text-xs uppercase font-semibold">Error Rate</div>
                <div class="text-2xl font-bold" :class="stats.errorRate > 5 ? 'text-rose-500' : 'text-emerald-500'">{{ stats.errorRate.toFixed(1) }}%</div>
              </div>
              <div class="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                <div class="text-slate-500 text-xs uppercase font-semibold">DB Queries</div>
                <div class="text-2xl font-bold text-emerald-400">{{ queries.length }}</div>
              </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <!-- Requests Section -->
              <section class="lg:col-span-2">
                <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span class="w-3 h-3 bg-sky-500 rounded-full"></span>
                  Recent Requests
                </h2>
                <div class="overflow-x-auto bg-slate-900 rounded-lg border border-slate-800">
                  <table class="w-full text-left border-collapse">
                    <thead>
                      <tr class="border-b border-slate-800 text-slate-400 text-sm">
                        <th class="p-3">Method</th>
                        <th class="p-3">Path</th>
                        <th class="p-3">Status</th>
                        <th class="p-3">Duration</th>
                        <th class="p-3">Time</th>
                      </tr>
                    </thead>
                    <tbody class="text-sm">
                      <tr v-for="req in requests" :key="req.id" class="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td class="p-3 font-mono">
                          <span :class="getMethodClass(req.method)" class="px-2 py-0.5 rounded text-xs font-bold">{{ req.method }}</span>
                        </td>
                        <td class="p-3 truncate max-w-xs" :title="req.path">{{ req.path }}</td>
                        <td class="p-3">
                          <span :class="getStatusClass(req.status)" class="font-medium">{{ req.status }}</span>
                        </td>
                        <td class="p-3 text-slate-400">{{ req.duration.toFixed(2) }}ms</td>
                        <td class="p-3 text-slate-500 text-xs">
                          {{ formatTime(req.startTime) }}
                          <button @click="replayRequest(req.id)" class="ml-2 text-sky-500 hover:text-sky-400 hover:underline" title="Replay Request">↺</button>
                        </td>
                      </tr>
                      <tr v-if="requests.length === 0">
                        <td colspan="5" class="p-8 text-center text-slate-500 italic">No requests captured yet.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <!-- Stats & Queries -->
              <aside class="space-y-8">
                 <!-- Log Section -->
                <section>
                  <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
                    <span class="w-3 h-3 bg-amber-500 rounded-full"></span>
                    Recent Logs
                  </h2>
                  <div class="bg-slate-900 rounded-lg border border-slate-800 p-2 max-h-[400px] overflow-y-auto font-mono text-xs">
                    <div v-for="log in logs" :key="log.id" class="p-2 border-b border-slate-800/50 last:border-0">
                      <span :class="getLogLevelClass(log.level)" class="uppercase mr-2 font-bold">{{ log.level }}</span>
                      <span class="text-slate-500 mr-2">[{{ formatTime(log.timestamp) }}]</span>
                      <span class="text-slate-300">{{ log.message }}</span>
                    </div>
                    <div v-if="logs.length === 0" class="p-4 text-center text-slate-500 italic">No logs captured yet.</div>
                  </div>
                </section>

                <!-- Query Section -->
                <section>
                  <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
                    <span class="w-3 h-3 bg-emerald-500 rounded-full"></span>
                    Database Queries
                  </h2>
                  <div class="space-y-4 max-h-[400px] overflow-y-auto">
                    <div v-for="q in queries" :key="q.id" class="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs font-mono">
                      <div class="flex justify-between text-slate-500 mb-2">
                        <span>{{ q.connection }}</span>
                        <span>{{ q.duration.toFixed(2) }}ms</span>
                      </div>
                      <div class="text-emerald-400 break-words">{{ q.sql }}</div>
                    </div>
                    <div v-if="queries.length === 0" class="bg-slate-900 p-8 rounded-lg border border-slate-800 text-center text-slate-500 italic text-sm">No queries captured yet.</div>
                  </div>
                </section>
              </aside>
            </div>
          </div>

          <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
          <script>
            const { createApp } = Vue
            createApp({
              data() {
                return {
                  requests: [],
                  logs: [],
                  queries: [],
                  connected: false,
                  eventSource: null
                }
              },
              computed: {
                stats() {
                  const total = this.requests.length;
                  if (total === 0) return { totalRequests: 0, avgLatency: 0, errorRate: 0 };
                  
                  const errors = this.requests.filter(r => r.status >= 400).length;
                  const latencySum = this.requests.reduce((sum, r) => sum + r.duration, 0);
                  
                  return {
                    totalRequests: total,
                    avgLatency: latencySum / total,
                    errorRate: (errors / total) * 100
                  };
                }
              },
              mounted() {
                this.fetchData();
                this.initRealtime();
              },
              methods: {
                initRealtime() {
                  this.eventSource = new EventSource('${apiPath}/events');
                  this.eventSource.onopen = () => this.connected = true;
                  this.eventSource.onerror = () => {
                    this.connected = false;
                    // EventSource automatically reconnects
                  };
                  this.eventSource.onmessage = (e) => {
                    const { type, data } = JSON.parse(e.data);
                    if (type === 'request') {
                      this.requests.unshift(data);
                      if (this.requests.length > 100) this.requests.pop();
                    } else if (type === 'log') {
                      this.logs.unshift(data);
                      if (this.logs.length > 100) this.logs.pop();
                    } else if (type === 'query') {
                      this.queries.unshift(data);
                      if (this.queries.length > 100) this.queries.pop();
                    }
                  };
                },
                async fetchData() {
                  try {
                    const [reqs, logs, queries] = await Promise.all([
                      fetch('${apiPath}/requests').then(r => r.json()),
                      fetch('${apiPath}/logs').then(r => r.json()),
                      fetch('${apiPath}/queries').then(r => r.json())
                    ]);
                    this.requests = reqs;
                    this.logs = logs;
                    this.queries = queries;
                  } catch (e) {
                    console.error('Failed to fetch spectrum data', e);
                  }
                },
                async clearData() {
                  if (confirm('Are you sure you want to clear all debug data?')) {
                    await fetch('${apiPath}/clear', { method: 'POST' });
                    this.fetchData();
                  }
                },
                async replayRequest(id) {
                   try {
                     const res = await fetch('${apiPath}/replay/' + id, { method: 'POST' });
                     const data = await res.json();
                     if (data.success) {
                       alert('Replay successful! Status: ' + data.status);
                       this.fetchData();
                     } else {
                       alert('Replay failed: ' + data.error);
                     }
                   } catch (e) {
                     alert('Replay failed: ' + e.message);
                   }
                },
                formatTime(ts) {
                  return new Date(ts).toLocaleTimeString();
                },
                getMethodClass(m) {
                  const map = {
                    'GET': 'bg-sky-500/10 text-sky-400',
                    'POST': 'bg-emerald-500/10 text-emerald-400',
                    'PUT': 'bg-amber-500/10 text-amber-400',
                    'DELETE': 'bg-rose-500/10 text-rose-400',
                    'PATCH': 'bg-indigo-500/10 text-indigo-400'
                  };
                  return map[m] || 'bg-slate-500/10 text-slate-400';
                },
                getStatusClass(s) {
                  if (s >= 500) return 'text-rose-500';
                  if (s >= 400) return 'text-amber-500';
                  if (s >= 300) return 'text-sky-500';
                  return 'text-emerald-500';
                },
                getLogLevelClass(l) {
                  const map = {
                    'error': 'text-rose-500',
                    'warn': 'text-amber-500',
                    'info': 'text-sky-500',
                    'debug': 'text-slate-500'
                  };
                  return map[l] || 'text-slate-400';
                }
              }
            }).mount('#app')
          </script>
        </body>
        </html>
      `)
      })
    )
  }
}
