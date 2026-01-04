import { DB } from '@gravito/atlas'
import { Photon } from '@gravito/photon'
import { QuasarAgent } from '@gravito/quasar'
import { MySQLPersistence, SQLitePersistence } from '@gravito/stream'
import fs from 'fs'
import { serveStatic } from 'hono/bun'
import { getCookie } from 'hono/cookie'
import { streamSSE } from 'hono/streaming'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  authMiddleware,
  createSession,
  destroySession,
  isAuthEnabled,
  verifyPassword,
} from './middleware/auth'
import { CommandService } from './services/CommandService'
import { PulseService } from './services/PulseService'
import { QueueService } from './services/QueueService'

const app = new Photon()

// Configuration
const PORT = parseInt(process.env.PORT || '3000', 10)
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
const QUEUE_PREFIX = process.env.QUEUE_PREFIX || 'queue:'

// Persistence Initialize
let persistence:
  | { adapter: any; archiveCompleted: boolean; archiveFailed: boolean; archiveEnqueued: boolean }
  | undefined

const dbDriver = process.env.DB_DRIVER || (process.env.DB_HOST ? 'mysql' : 'sqlite')

if (dbDriver === 'sqlite' || process.env.DB_HOST) {
  if (dbDriver === 'sqlite') {
    DB.addConnection('default', {
      driver: 'sqlite',
      database: process.env.DB_NAME || 'flux.sqlite',
    })
  } else {
    DB.addConnection('default', {
      driver: dbDriver as any,
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306', 10),
      database: process.env.DB_NAME || 'flux',
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    })
  }

  const adapter = dbDriver === 'sqlite' ? new SQLitePersistence(DB) : new MySQLPersistence(DB)
  adapter.setupTable().catch((err) => console.error('[FluxConsole] SQL Archive Setup Error:', err))

  persistence = {
    adapter,
    archiveCompleted: process.env.PERSIST_ARCHIVE_COMPLETED === 'true',
    archiveFailed: process.env.PERSIST_ARCHIVE_FAILED !== 'false',
    archiveEnqueued: process.env.PERSIST_ARCHIVE_ENQUEUED === 'true',
  }
  console.log(`[FluxConsole] SQL Archive enabled via ${dbDriver}`)
}

// Service Initialization
const queueService = new QueueService(REDIS_URL, QUEUE_PREFIX, persistence)
const pulseService = new PulseService(REDIS_URL)
const commandService = new CommandService(REDIS_URL)

queueService
  .connect()
  .then(() => pulseService.connect())
  .then(() => commandService.connect())
  .then(() => {
    // Start Self-Monitoring (Quasar)
    const agent = new QuasarAgent({
      service: 'flux-console',
      redisUrl: REDIS_URL,
    })
    agent.start().catch((err) => console.error('[FluxConsole] Quasar Agent Error:', err))

    console.log(`[FluxConsole] Connected to Redis at ${REDIS_URL}`)
    // Start background metrics recording (Reduced from 5s to 2s for better real-time feel)
    const updateMetrics = async () => {
      try {
        const [pulseNodes, legacyWorkers] = await Promise.all([
          pulseService.getNodes(),
          queueService.listWorkers(),
        ])

        const pulseWorkers = Object.values(pulseNodes)
          .flat()
          .flatMap((node) => {
            const mainNode = {
              id: node.id,
              service: node.service,
              status: node.runtime.status || 'online',
              pid: node.pid,
              uptime: node.runtime.uptime,
              metrics: {
                cpu: node.cpu.process,
                cores: node.cpu.cores,
                ram: {
                  rss: node.memory.process.rss,
                  heapUsed: node.memory.process.heapUsed,
                  total: node.memory.system.total,
                },
              },
              queues: node.queues,
              meta: node.meta,
            }

            const subWorkers: any[] = []
            if (node.meta?.laravel?.workers && Array.isArray(node.meta.laravel.workers)) {
              node.meta.laravel.workers.forEach((w: any) => {
                subWorkers.push({
                  id: `${node.id}-php-${w.pid}`,
                  service: `${node.service} / LARAVEL`,
                  status: w.status === 'running' || w.status === 'sleep' ? 'online' : 'idle',
                  pid: w.pid,
                  uptime: node.runtime.uptime,
                  metrics: {
                    cpu: w.cpu,
                    cores: 1,
                    ram: {
                      rss: w.memory,
                      heapUsed: w.memory,
                      total: node.memory.system.total,
                    },
                  },
                  meta: { isVirtual: true, cmdline: w.cmdline },
                })
              })
            }
            return [mainNode, ...subWorkers]
          })

        const formattedLegacy = legacyWorkers.map((w) => ({
          id: w.id,
          status: 'online',
          pid: w.pid,
          uptime: w.uptime,
          metrics: {
            cpu: (w.loadAvg[0] || 0) * 100,
            cores: 0,
            ram: {
              rss: parseInt(w.memory.rss || '0', 10),
              heapUsed: parseInt(w.memory.heapUsed || '0', 10),
              total: 0,
            },
          },
          queues: w.queues.map((q) => ({
            name: q,
            size: { waiting: 0, active: 0, failed: 0, delayed: 0 },
          })),
          meta: {},
        }))

        await queueService.recordStatusMetrics(pulseNodes, [...pulseWorkers, ...formattedLegacy])
      } catch (err) {
        console.error('[FluxConsole] Metrics Update Error:', err)
      }
    }

    setInterval(updateMetrics, 2000)

    // Start Scheduler Tick (Reduced from 10s to 5s)
    setInterval(() => {
      queueService.tickScheduler().catch(console.error)
    }, 5000)

    // Record initial snapshot
    updateMetrics()
  })
  .catch((err) => {
    console.error('[FluxConsole] Failed to connect to Redis', err)
  })

const api = new Photon()

api.get('/health', (c) => c.json({ status: 'ok', time: new Date().toISOString() }))

// Auth endpoints (no middleware protection)
api.get('/auth/status', (c) => {
  const token = getCookie(c, 'flux_session')
  const isAuthenticated =
    !isAuthEnabled() || (token && require('./middleware/auth').validateSession(token))
  return c.json({
    enabled: isAuthEnabled(),
    authenticated: !!isAuthenticated,
  })
})

api.post('/auth/login', async (c) => {
  try {
    const { password } = await c.req.json()

    if (!verifyPassword(password)) {
      return c.json({ success: false, error: 'Invalid password' }, 401)
    }

    createSession(c)
    return c.json({ success: true })
  } catch (_err) {
    return c.json({ success: false, error: 'Login failed' }, 500)
  }
})

api.post('/auth/logout', (c) => {
  destroySession(c)
  return c.json({ success: true })
})

// Apply auth middleware to all other API routes
api.use('/*', authMiddleware)

api.get('/queues', async (c) => {
  try {
    const queues = await queueService.listQueues()
    return c.json({ queues })
  } catch (err) {
    console.error(err)
    return c.json({ error: 'Failed to list queues' }, 500)
  }
})

api.get('/search', async (c) => {
  const query = c.req.query('q') || ''
  const type = (c.req.query('type') as 'all' | 'waiting' | 'delayed' | 'failed') || 'all'
  const limit = parseInt(c.req.query('limit') || '20', 10)

  if (!query || query.length < 2) {
    return c.json({ results: [], message: 'Query must be at least 2 characters' })
  }

  try {
    const results = await queueService.searchJobs(query, { type, limit })
    return c.json({ results, query, count: results.length })
  } catch (err) {
    console.error(err)
    return c.json({ error: 'Search failed' }, 500)
  }
})

api.get('/archive/search', async (c) => {
  const query = c.req.query('q') || ''
  const queue = c.req.query('queue')
  const page = parseInt(c.req.query('page') || '1', 10)
  const limit = parseInt(c.req.query('limit') || '50', 10)

  if (!query) {
    return c.json({ results: [] })
  }

  try {
    const { jobs, total } = await queueService.searchArchive(query, { queue, page, limit })
    return c.json({ results: jobs, query, count: total })
  } catch (err) {
    console.error(err)
    return c.json({ error: 'Archive search failed' }, 500)
  }
})

api.get('/logs/archive', async (c) => {
  const level = c.req.query('level')
  const workerId = c.req.query('workerId')
  const queue = c.req.query('queue')
  const search = c.req.query('search')

  const startTime = c.req.query('startTime') ? new Date(c.req.query('startTime')!) : undefined
  const endTime = c.req.query('endTime') ? new Date(c.req.query('endTime')!) : undefined
  const page = parseInt(c.req.query('page') || '1', 10)
  const limit = parseInt(c.req.query('limit') || '50', 10)

  try {
    const results = await queueService.getArchivedLogs({
      level,
      workerId,
      queue,
      search,
      startTime,
      endTime,
      page,
      limit,
    })
    return c.json(results)
  } catch (err) {
    console.error(err)
    return c.json({ error: 'Failed to fetch archived logs' }, 500)
  }
})

api.post('/queues/:name/retry-all', async (c) => {
  const name = c.req.param('name')
  try {
    const count = await queueService.retryDelayedJob(name)
    return c.json({ success: true, count })
  } catch (_err) {
    return c.json({ error: 'Failed to retry jobs' }, 500)
  }
})

api.post('/queues/:name/retry-all-failed', async (c) => {
  const name = c.req.param('name')
  try {
    const count = await queueService.retryAllFailedJobs(name)
    return c.json({ success: true, count })
  } catch (_err) {
    return c.json({ error: 'Failed to retry failed jobs' }, 500)
  }
})

api.post('/queues/:name/clear-failed', async (c) => {
  const name = c.req.param('name')
  try {
    await queueService.clearFailedJobs(name)
    return c.json({ success: true })
  } catch (_err) {
    return c.json({ error: 'Failed to clear failed jobs' }, 500)
  }
})

api.post('/queues/:name/pause', async (c) => {
  const name = c.req.param('name')
  try {
    await queueService.pauseQueue(name)
    return c.json({ success: true, paused: true })
  } catch (_err) {
    return c.json({ error: 'Failed to pause queue' }, 500)
  }
})

api.post('/queues/:name/resume', async (c) => {
  const name = c.req.param('name')
  try {
    await queueService.resumeQueue(name)
    return c.json({ success: true, paused: false })
  } catch (_err) {
    return c.json({ error: 'Failed to resume queue' }, 500)
  }
})

api.get('/queues/:name/jobs', async (c) => {
  const name = c.req.param('name')
  const type = (c.req.query('type') as 'waiting' | 'delayed' | 'failed') || 'waiting'
  try {
    const jobs = await queueService.getJobs(name, type)
    return c.json({ jobs })
  } catch (err) {
    console.error(err)
    return c.json({ error: 'Failed to fetch jobs' }, 500)
  }
})

api.get('/queues/:name/jobs/count', async (c) => {
  const name = c.req.param('name')
  const type = (c.req.query('type') as 'waiting' | 'delayed' | 'failed') || 'waiting'
  try {
    const count = await queueService.getJobCount(name, type)
    return c.json({ count })
  } catch (err) {
    console.error(err)
    return c.json({ error: 'Failed to count jobs' }, 500)
  }
})

api.get('/queues/:name/archive', async (c) => {
  const name = c.req.param('name')
  const page = parseInt(c.req.query('page') || '1', 10)
  const limit = parseInt(c.req.query('limit') || '50', 10)

  const status = c.req.query('status') as 'completed' | 'failed' | undefined
  const jobId = c.req.query('jobId')
  const startTime = c.req.query('startTime') ? new Date(c.req.query('startTime')!) : undefined
  const endTime = c.req.query('endTime') ? new Date(c.req.query('endTime')!) : undefined

  try {
    const { jobs, total } = await queueService.getArchiveJobs(name, page, limit, status, {
      jobId,
      startTime,
      endTime,
    })
    return c.json({ jobs, total })
  } catch (err) {
    console.error(err)
    return c.json({ error: 'Failed to fetch archived jobs' }, 500)
  }
})

api.get('/throughput', async (c) => {
  try {
    const data = await queueService.getThroughputData()
    return c.json({ data })
  } catch (_err) {
    return c.json({ error: 'Failed to fetch throughput' }, 500)
  }
})

api.get('/workers', async (c) => {
  try {
    const [legacyWorkers, pulseNodes] = await Promise.all([
      queueService.listWorkers(),
      pulseService.getNodes(),
    ])

    // Transform PulseNodes to match the frontend Worker interface
    const pulseWorkers = Object.values(pulseNodes)
      .flat()
      .flatMap((node) => {
        // 1. The Main Agent Node
        const mainNode = {
          id: node.id,
          service: node.service,
          status: node.runtime.status || 'online',
          pid: node.pid,
          uptime: node.runtime.uptime,
          metrics: {
            cpu: node.cpu.process,
            cores: node.cpu.cores,
            ram: {
              rss: node.memory.process.rss,
              heapUsed: node.memory.process.heapUsed,
              total: node.memory.system.total,
            },
          },
          queues: node.queues,
          meta: node.meta,
        }

        // 2. Virtual Child Workers (e.g. Laravel)
        const subWorkers: any[] = []
        if (node.meta?.laravel?.workers && Array.isArray(node.meta.laravel.workers)) {
          node.meta.laravel.workers.forEach((w: any) => {
            subWorkers.push({
              id: `${node.id}-php-${w.pid}`,
              service: `${node.service} / LARAVEL`, // Distinct service name
              status: w.status === 'running' || w.status === 'sleep' ? 'online' : 'idle',
              pid: w.pid,
              uptime: node.runtime.uptime, // Inherit uptime for now, or 0
              metrics: {
                cpu: w.cpu, // Per-process CPU
                cores: 1, // Single threaded PHP
                ram: {
                  rss: w.memory,
                  heapUsed: w.memory,
                  total: node.memory.system.total,
                },
              },
              meta: {
                // Tag it so UI can maybe style it differently?
                isVirtual: true,
                cmdline: w.cmdline,
              },
            })
          })
        }

        return [mainNode, ...subWorkers]
      })

    // Transform Legacy Workers to match interface (best effort)
    const formattedLegacy = legacyWorkers.map((w) => ({
      id: w.id,
      status: 'online',
      pid: w.pid,
      uptime: w.uptime,
      metrics: {
        cpu: (w.loadAvg[0] || 0) * 100, // Rough estimate
        cores: 0,
        ram: {
          rss: parseInt(w.memory.rss || '0', 10),
          heapUsed: parseInt(w.memory.heapUsed || '0', 10),
          total: 0,
        },
      },
      queues: w.queues.map((q) => ({
        name: q,
        size: { waiting: 0, active: 0, failed: 0, delayed: 0 },
      })),
      meta: {},
    }))

    return c.json({ workers: [...pulseWorkers, ...formattedLegacy] })
  } catch (_err) {
    console.error(_err)
    return c.json({ error: 'Failed to fetch workers' }, 500)
  }
})

api.get('/metrics/history', async (c) => {
  try {
    const metrics = ['waiting', 'delayed', 'failed', 'workers']
    const history: Record<string, number[]> = {}

    await Promise.all(
      metrics.map(async (m) => {
        history[m] = await queueService.getMetricHistory(m)
      })
    )

    return c.json({ history })
  } catch (_err) {
    return c.json({ error: 'Failed to fetch metrics history' }, 500)
  }
})

api.get('/system/status', (c) => {
  const mem = process.memoryUsage()
  const totalMem = os.totalmem()

  // Find package.json (relative to this file in src/server/index.ts)
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const pkgPath = path.resolve(__dirname, '../../package.json')
  let pkg = { version: '0.1.0-unknown', name: '@gravito/zenith' }
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  } catch (_e) {
    // fallback
  }

  return c.json({
    node: process.version,
    memory: {
      rss: `${(mem.rss / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      total: `${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
    },
    version: pkg.version,
    package: pkg.name,
    engine: `Zenith ${pkg.version}`,
    uptime: process.uptime(),
    env:
      process.env.NODE_ENV === 'production'
        ? `production (${os.hostname()})`
        : `development (${os.hostname()})`,
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  })
})

// --- Pulse Monitoring ---
api.get('/pulse/nodes', async (c) => {
  try {
    const nodes = await pulseService.getNodes()
    return c.json({ nodes })
  } catch (_err) {
    return c.json({ error: 'Failed to fetch pulse nodes' }, 500)
  }
})

// --- Pulse Remote Control (Phase 3) ---
api.post('/pulse/command', async (c) => {
  try {
    const { service, nodeId, type, queue, jobKey, driver, action } = await c.req.json()

    // Validate required fields
    if (!service || !nodeId || !type || !queue || !jobKey) {
      return c.json({ error: 'Missing required fields: service, nodeId, type, queue, jobKey' }, 400)
    }

    // Validate command type
    if (type !== 'RETRY_JOB' && type !== 'DELETE_JOB' && type !== 'LARAVEL_ACTION') {
      return c.json(
        { error: 'Invalid command type. Allowed: RETRY_JOB, DELETE_JOB, LARAVEL_ACTION' },
        400
      )
    }

    const commandId = await commandService.sendCommand(service, nodeId, type, {
      queue,
      jobKey,
      driver: driver || 'redis',
      action,
    })

    return c.json({
      success: true,
      commandId,
      message: `Command ${type} sent to ${nodeId}. Observe job state for result.`,
    })
  } catch (err) {
    console.error('[CommandService] Error:', err)
    return c.json({ error: 'Failed to send command' }, 500)
  }
})

api.post('/queues/:name/jobs/delete', async (c) => {
  const queueName = c.req.param('name')
  const { type, raw } = await c.req.json()
  try {
    const success = await queueService.deleteJob(queueName, type, raw)
    return c.json({ success })
  } catch (_err) {
    return c.json({ error: 'Failed to delete job' }, 500)
  }
})

api.post('/queues/:name/jobs/retry', async (c) => {
  const queueName = c.req.param('name')
  const { raw } = await c.req.json()
  try {
    const success = await queueService.retryJob(queueName, raw)
    return c.json({ success })
  } catch (_err) {
    return c.json({ error: 'Failed to retry job' }, 500)
  }
})

api.post('/queues/:name/jobs/bulk-delete', async (c) => {
  const queueName = c.req.param('name')
  const { type, raws } = await c.req.json()
  try {
    const deleted = await queueService.deleteJobs(queueName, type, raws)
    return c.json({ success: true, count: deleted })
  } catch (_err) {
    return c.json({ error: 'Failed to bulk delete' }, 500)
  }
})

api.post('/queues/:name/jobs/bulk-retry', async (c) => {
  const queueName = c.req.param('name')
  const { type, raws } = await c.req.json()
  try {
    const retried = await queueService.retryJobs(queueName, type, raws)
    return c.json({ success: true, count: retried })
  } catch (_err) {
    return c.json({ error: 'Failed to bulk retry' }, 500)
  }
})

api.post('/queues/:name/jobs/bulk-delete-all', async (c) => {
  const queueName = c.req.param('name')
  const { type } = await c.req.json()
  try {
    const deleted = await queueService.deleteAllJobs(queueName, type)
    return c.json({ success: true, count: deleted })
  } catch (_err) {
    return c.json({ error: 'Failed to bulk delete all' }, 500)
  }
})

api.post('/queues/:name/jobs/bulk-retry-all', async (c) => {
  const queueName = c.req.param('name')
  const { type } = await c.req.json()
  try {
    const retried = await queueService.retryAllJobs(queueName, type)
    return c.json({ success: true, count: retried })
  } catch (_err) {
    return c.json({ error: 'Failed to bulk retry all' }, 500)
  }
})

api.post('/maintenance/cleanup-archive', async (c) => {
  const { days = 30 } = await c.req.json()
  try {
    const deleted = await queueService.cleanupArchive(days)
    return c.json({ success: true, deleted })
  } catch (_err) {
    return c.json({ error: 'Failed to cleanup archive' }, 500)
  }
})

api.post('/queues/:name/purge', async (c) => {
  const name = c.req.param('name')
  try {
    await queueService.purgeQueue(name)
    return c.json({ success: true })
  } catch (_err) {
    return c.json({ error: 'Failed to purge queue' }, 500)
  }
})

api.get('/logs/stream', async (c) => {
  return streamSSE(c, async (stream) => {
    // 1. Send history first
    const history = await queueService.getLogHistory()
    for (const log of history) {
      await stream.writeSSE({
        data: JSON.stringify(log),
        event: 'log',
      })
    }

    // 2. Subscribe to new logs
    const unsubscribeLogs = queueService.onLog(async (msg) => {
      await stream.writeSSE({
        data: JSON.stringify(msg),
        event: 'log',
      })
    })

    // 3. Subscribe to real-time stats
    const unsubscribeStats = queueService.onStats(async (stats) => {
      await stream.writeSSE({
        data: JSON.stringify(stats),
        event: 'stats',
      })
    })

    // 4. Poll Pulse Nodes per client (simple polling for now)
    const pulseInterval = setInterval(async () => {
      try {
        const nodes = await pulseService.getNodes()
        await stream.writeSSE({
          data: JSON.stringify({ nodes }),
          event: 'pulse',
        })
      } catch (err) {
        // ignore errors
      }
    }, 2000)

    stream.onAbort(() => {
      unsubscribeLogs()
      unsubscribeStats()
      clearInterval(pulseInterval)
    })

    // Keep alive
    while (true) {
      await stream.sleep(5000)
      await stream.writeSSE({ data: 'heartbeat', event: 'ping' })
    }
  })
})

// --- Schedules ---
api.get('/schedules', async (c) => {
  try {
    const schedules = await queueService.listSchedules()
    return c.json({ schedules })
  } catch (_err) {
    return c.json({ error: 'Failed to list schedules' }, 500)
  }
})

api.post('/schedules', async (c) => {
  const body = await c.req.json()
  try {
    await queueService.registerSchedule(body)
    return c.json({ success: true })
  } catch (_err) {
    return c.json({ error: 'Failed to register schedule' }, 500)
  }
})

api.post('/schedules/run/:id', async (c) => {
  const id = c.req.param('id')
  try {
    await queueService.runScheduleNow(id)
    return c.json({ success: true })
  } catch (_err) {
    return c.json({ error: 'Failed to run schedule' }, 500)
  }
})

api.delete('/schedules/:id', async (c) => {
  const id = c.req.param('id')
  try {
    await queueService.removeSchedule(id)
    return c.json({ success: true })
  } catch (_err) {
    return c.json({ error: 'Failed to remove schedule' }, 500)
  }
})

// --- Alerting ---
api.get('/alerts/config', async (c) => {
  return c.json({
    rules: queueService.alerts.getRules(),
    config: queueService.alerts.getConfig(),
    maintenance: await queueService.getMaintenanceConfig(),
  })
})

api.post('/maintenance/config', async (c) => {
  const config = await c.req.json()
  try {
    await queueService.saveMaintenanceConfig(config)
    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: 'Failed to save maintenance config' }, 500)
  }
})

api.post('/alerts/config', async (c) => {
  const config = await c.req.json()
  try {
    await queueService.alerts.saveConfig(config)
    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: 'Failed to save alert config' }, 500)
  }
})

api.post('/alerts/rules', async (c) => {
  const rule = await c.req.json()
  try {
    await queueService.alerts.addRule(rule)
    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: 'Failed to add rule' }, 500)
  }
})

api.delete('/alerts/rules/:id', async (c) => {
  const id = c.req.param('id')
  try {
    await queueService.alerts.deleteRule(id)
    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: 'Failed to delete rule' }, 500)
  }
})

api.post('/alerts/test', async (c) => {
  try {
    const nodes = await pulseService.getNodes()
    queueService.alerts.check({
      queues: [],
      nodes,
      workers: [
        {
          id: 'test-node',
          hostname: 'localhost',
          pid: 0,
          uptime: 0,
          memory: { rss: '0', heapTotal: '0', heapUsed: '0' },
          queues: [],
        },
      ] as any,
      totals: { waiting: 9999, delayed: 0, failed: 9999 },
    })
    return c.json({ success: true, message: 'Test alert dispatched' })
  } catch (_err) {
    return c.json({ error: 'Test failed' }, 500)
  }
})

app.route('/api', api)

app.use(
  '/*',
  serveStatic({
    root: './dist/client',
  })
)

app.get('*', serveStatic({ path: './dist/client/index.html' }))

console.log(`[FluxConsole] Server starting on http://localhost:${PORT}`)

export default {
  port: PORT,
  fetch: app.fetch,
}
