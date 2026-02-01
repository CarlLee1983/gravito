import type { GravitoContext } from '@gravito/core'
import type { QueueManager } from './QueueManager'

/**
 * Provides API routes for the Stream Monitoring Dashboard.
 *
 * This class encapsulates the logic for querying queue statistics,
 * browsing archived jobs, and performing management actions like retrying jobs.
 *
 * @internal
 */
export class DashboardProvider {
  constructor(private manager: QueueManager) {}

  /**
   * Registers dashboard API routes on the provided core adapter.
   *
   * @param core - The PlanetCore instance.
   * @param basePath - The base path for API routes (default: '/_flux').
   */
  registerRoutes(core: any, basePath = '/_flux'): void {
    const router = core.adapter

    router.get(`${basePath}/stats`, async (c: GravitoContext) => {
      const stats = await this.manager.getGlobalStats()
      return c.json(stats)
    })

    router.get(`${basePath}/queues`, async (c: GravitoContext) => {
      const stats = await this.manager.getGlobalStats()
      const queues = Object.entries(stats.connections).flatMap(([conn, qList]) =>
        qList.map((q: any) => ({
          connection: conn,
          name: q.queue,
          size: q.size,
          failed: q.failed,
        }))
      )
      return c.json(queues)
    })

    router.get(`${basePath}/jobs`, async (c: GravitoContext) => {
      const queue = c.req.query('queue') || 'default'
      const status = c.req.query('status')
      const limit = parseInt(c.req.query('limit') || '50', 10)
      const offset = parseInt(c.req.query('offset') || '0', 10)

      const persistence = this.manager.getPersistence()
      if (!persistence) {
        return c.json({ error: 'Persistence not configured' }, 400)
      }

      const statuses = status ? (status.includes(',') ? status.split(',') : status) : undefined
      const [jobs, total] = await Promise.all([
        persistence.list(queue, { status: statuses as any, limit, offset }),
        persistence.count(queue, { status: statuses as any }),
      ])

      return c.json({
        data: jobs,
        meta: {
          total,
          limit,
          offset,
        },
      })
    })

    router.post(`${basePath}/jobs/retry`, async (c: GravitoContext) => {
      const { queue, count } = await c.req.json<{ queue: string; count?: number }>()
      if (!queue) return c.json({ error: 'Queue name is required' }, 400)

      const retried = await this.manager.retryFailed(queue, count || 1)
      return c.json({ success: true, retried })
    })

    router.get(`${basePath}/logs`, async (c: GravitoContext) => {
      const persistence = this.manager.getPersistence()
      if (!persistence) {
        return c.json({ error: 'Persistence not configured' }, 400)
      }

      const limit = parseInt(c.req.query('limit') || '100', 10)
      const offset = parseInt(c.req.query('offset') || '0', 10)
      const level = c.req.query('level')
      const search = c.req.query('search')

      const [logs, total] = await Promise.all([
        persistence.listLogs({ limit, offset, level, search }),
        persistence.countLogs({ level, search }),
      ])

      return c.json({
        data: logs,
        meta: {
          total,
          limit,
          offset,
        },
      })
    })
  }
}
