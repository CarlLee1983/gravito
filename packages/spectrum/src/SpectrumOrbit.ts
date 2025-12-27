/**
 * @gravito/spectrum - SpectrumOrbit
 */

import type { GravitoMiddleware, GravitoOrbit, Logger, PlanetCore } from 'gravito-core'
import { collector } from './collectors/DataCollector'
import type { CapturedLog, CapturedRequest } from './types'

export interface SpectrumConfig {
  path?: string
  maxItems?: number
  enabled?: boolean
}

export class SpectrumOrbit implements GravitoOrbit {
  readonly name = 'spectrum'
  private config: Required<SpectrumConfig>

  constructor(config: SpectrumConfig = {}) {
    this.config = {
      path: config.path || '/gravito/spectrum',
      maxItems: config.maxItems || 100,
      enabled: config.enabled !== undefined ? config.enabled : true,
    }
  }

  async install(core: PlanetCore): Promise<void> {
    if (!this.config.enabled) {
      return
    }

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
    // We use a try-catch and dynamic check to avoid hard dependency issues if Atlas is not used
    try {
      // Try to find Connection class from @gravito/atlas if it's loaded
      // In a monorepo or standard install, it might be available globally or via require
      // For now, we can check if DB is initialized or if we can import it.
      // Since this is a plugin, we can try to look it up in the global scope if it registers itself,
      // or just try to import it.

      // Better way: Check if core has 'db' service or similar
      // But Atlas doesn't necessarily register itself to core automatically.

      // Let's use a more generic approach: try to import @gravito/atlas
      // @ts-expect-error
      import('@gravito/atlas')
        .then((atlas) => {
          if (atlas?.Connection) {
            atlas.Connection.queryListeners.push((query: any) => {
              collector.addQuery({
                id: crypto.randomUUID(),
                ...query,
              })
            })
            core.logger.info('[Spectrum] Database query collection enabled')
          }
        })
        .catch(() => {
          // Atlas not found, skip
        })
    } catch (_e) {
      // Skip
    }
  }

  private setupHttpCollection(core: PlanetCore) {
    const middleware: GravitoMiddleware = async (c, next) => {
      // Skip spectrum's own API calls to avoid infinite loops/noise
      if (c.req.path.startsWith(this.config.path)) {
        await next()
        return undefined
      }

      const startTime = performance.now()
      const startTimestamp = Date.now()

      const res = (await next()) as Response | undefined

      const duration = performance.now() - startTime

      // Get status and headers from either the returned response or context
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

      collector.addRequest(request)
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
    const log: CapturedLog = {
      id: crypto.randomUUID(),
      level,
      message,
      args,
      timestamp: Date.now(),
    }
    collector.addLog(log)
  }

  private registerRoutes(core: PlanetCore) {
    const router = core.router
    const apiPath = `${this.config.path}/api`

    router.get(`${apiPath}/requests`, (c) => {
      return c.json(collector.getRequests())
    })

    router.get(`${apiPath}/logs`, (c) => {
      return c.json(collector.getLogs())
    })

    router.get(`${apiPath}/queries`, (c) => {
      return c.json(collector.getQueries())
    })

    router.post(`${apiPath}/clear`, (c) => {
      collector.clear()
      return c.json({ success: true })
    })

    // Dashboard UI
    router.get(this.config.path, (c) => {
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
              <h1 class="text-2xl font-bold text-sky-400">Gravito <span class="text-white">Spectrum</span></h1>
              <div class="flex gap-4">
                <button @click="clearData" class="px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded text-sm font-medium transition">Clear Data</button>
                <button @click="fetchData" class="px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded text-sm font-medium transition">Refresh</button>
              </div>
            </header>

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
                        <td class="p-3 text-slate-500 text-xs">{{ formatTime(req.startTime) }}</td>
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
                  queries: []
                }
              },
              mounted() {
                this.fetchData();
                setInterval(this.fetchData, 3000); // Auto-refresh every 3s
              },
              methods: {
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
  }
}
