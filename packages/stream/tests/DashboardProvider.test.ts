import { describe, expect, it, mock } from 'bun:test'
import { DashboardProvider } from '../src/DashboardProvider'
import type { QueueManager } from '../src/QueueManager'
import type { PersistenceAdapter } from '../src/types'

function createMockPersistence(): PersistenceAdapter {
  return {
    archive: mock(() => Promise.resolve()),
    find: mock(() => Promise.resolve(null)),
    list: mock(() =>
      Promise.resolve([{ id: 'j-1', type: 'json', data: '{}', createdAt: Date.now() }])
    ),
    count: mock(() => Promise.resolve(10)),
    cleanup: mock(() => Promise.resolve(0)),
    archiveLog: mock(() => Promise.resolve()),
    listLogs: mock(() =>
      Promise.resolve([{ level: 'info', message: 'test', timestamp: new Date() }])
    ),
    countLogs: mock(() => Promise.resolve(5)),
  }
}

function createMockManager(opts: { persistence?: PersistenceAdapter } = {}) {
  return {
    getGlobalStats: mock(() =>
      Promise.resolve({
        connections: {
          redis: [
            { queue: 'default', size: 10, failed: 2 },
            { queue: 'emails', size: 5, failed: 0 },
          ],
        },
        totalSize: 15,
        totalFailed: 2,
        timestamp: Date.now(),
      })
    ),
    getPersistence: mock(() => opts.persistence || null),
    retryFailed: mock(() => Promise.resolve(3)),
  } as unknown as QueueManager
}

describe('DashboardProvider', () => {
  describe('registerRoutes', () => {
    it('should register all API routes', () => {
      const manager = createMockManager()
      const dashboard = new DashboardProvider(manager)

      const routes: Record<string, Function> = {}
      const mockCore = {
        adapter: {
          get: mock((path: string, handler: Function) => {
            routes[`GET ${path}`] = handler
          }),
          post: mock((path: string, handler: Function) => {
            routes[`POST ${path}`] = handler
          }),
        },
      }

      dashboard.registerRoutes(mockCore, '/_flux')

      expect(mockCore.adapter.get).toHaveBeenCalledTimes(4) // stats, queues, jobs, logs => 4 GET + 1 POST
      expect(mockCore.adapter.post).toHaveBeenCalledTimes(1) // retry
    })

    it('should use default path when not specified', () => {
      const manager = createMockManager()
      const dashboard = new DashboardProvider(manager)

      const paths: string[] = []
      const mockCore = {
        adapter: {
          get: mock((path: string) => paths.push(path)),
          post: mock((path: string) => paths.push(path)),
        },
      }

      dashboard.registerRoutes(mockCore)

      expect(paths.some((p) => p.startsWith('/_flux'))).toBe(true)
    })
  })

  describe('GET /stats', () => {
    it('should return global stats', async () => {
      const manager = createMockManager()
      const dashboard = new DashboardProvider(manager)

      const routes: Record<string, Function> = {}
      const mockCore = {
        adapter: {
          get: mock((path: string, handler: Function) => {
            routes[path] = handler
          }),
          post: mock(() => {}),
        },
      }

      dashboard.registerRoutes(mockCore, '/_flux')

      const mockJson = mock((data: any) => data)
      const mockContext: any = { json: mockJson }

      await routes['/_flux/stats'](mockContext)

      expect(manager.getGlobalStats).toHaveBeenCalled()
      expect(mockJson).toHaveBeenCalled()
    })
  })

  describe('GET /queues', () => {
    it('should return flattened queue list', async () => {
      const manager = createMockManager()
      const dashboard = new DashboardProvider(manager)

      const routes: Record<string, Function> = {}
      const mockCore = {
        adapter: {
          get: mock((path: string, handler: Function) => {
            routes[path] = handler
          }),
          post: mock(() => {}),
        },
      }

      dashboard.registerRoutes(mockCore, '/_flux')

      let jsonResult: any = null
      const mockContext: any = {
        json: mock((data: any) => {
          jsonResult = data
        }),
      }

      await routes['/_flux/queues'](mockContext)

      expect(jsonResult).toBeArray()
      expect(jsonResult).toHaveLength(2)
      expect(jsonResult[0].connection).toBe('redis')
      expect(jsonResult[0].name).toBe('default')
    })
  })

  describe('GET /jobs', () => {
    it('should return jobs with persistence', async () => {
      const persistence = createMockPersistence()
      const manager = createMockManager({ persistence })
      const dashboard = new DashboardProvider(manager)

      const routes: Record<string, Function> = {}
      const mockCore = {
        adapter: {
          get: mock((path: string, handler: Function) => {
            routes[path] = handler
          }),
          post: mock(() => {}),
        },
      }

      dashboard.registerRoutes(mockCore, '/_flux')

      let jsonResult: any = null
      const mockContext: any = {
        req: {
          query: mock((key: string) => {
            if (key === 'queue') {
              return 'default'
            }
            if (key === 'status') {
              return 'completed'
            }
            if (key === 'limit') {
              return '20'
            }
            if (key === 'offset') {
              return '5'
            }
            return null
          }),
        },
        json: mock((data: any) => {
          jsonResult = data
          return data
        }),
      }

      await routes['/_flux/jobs'](mockContext)

      expect(persistence.list).toHaveBeenCalled()
      expect(persistence.count).toHaveBeenCalled()
      expect(jsonResult.data).toBeDefined()
      expect(jsonResult.meta).toBeDefined()
    })

    it('should return error when persistence is not configured', async () => {
      const manager = createMockManager()
      const dashboard = new DashboardProvider(manager)

      const routes: Record<string, Function> = {}
      const mockCore = {
        adapter: {
          get: mock((path: string, handler: Function) => {
            routes[path] = handler
          }),
          post: mock(() => {}),
        },
      }

      dashboard.registerRoutes(mockCore, '/_flux')

      let jsonResult: any = null
      let statusCode: number | undefined
      const mockContext: any = {
        req: {
          query: mock(() => null),
        },
        json: mock((data: any, status?: number) => {
          jsonResult = data
          statusCode = status
          return data
        }),
      }

      await routes['/_flux/jobs'](mockContext)

      expect(jsonResult.error).toBe('Persistence not configured')
      expect(statusCode).toBe(400)
    })

    it('should handle comma-separated status filter', async () => {
      const persistence = createMockPersistence()
      const manager = createMockManager({ persistence })
      const dashboard = new DashboardProvider(manager)

      const routes: Record<string, Function> = {}
      const mockCore = {
        adapter: {
          get: mock((path: string, handler: Function) => {
            routes[path] = handler
          }),
          post: mock(() => {}),
        },
      }

      dashboard.registerRoutes(mockCore, '/_flux')

      const mockContext: any = {
        req: {
          query: mock((key: string) => {
            if (key === 'status') {
              return 'completed,failed'
            }
            return null
          }),
        },
        json: mock((data: any) => data),
      }

      await routes['/_flux/jobs'](mockContext)

      // status should be split into array
      expect(persistence.list).toHaveBeenCalled()
    })

    it('should use defaults when no query params', async () => {
      const persistence = createMockPersistence()
      const manager = createMockManager({ persistence })
      const dashboard = new DashboardProvider(manager)

      const routes: Record<string, Function> = {}
      const mockCore = {
        adapter: {
          get: mock((path: string, handler: Function) => {
            routes[path] = handler
          }),
          post: mock(() => {}),
        },
      }

      dashboard.registerRoutes(mockCore, '/_flux')

      const mockContext: any = {
        req: {
          query: mock(() => null),
        },
        json: mock((data: any) => data),
      }

      await routes['/_flux/jobs'](mockContext)
      expect(persistence.list).toHaveBeenCalled()
    })
  })

  describe('POST /jobs/retry', () => {
    it('should retry failed jobs', async () => {
      const manager = createMockManager()
      const dashboard = new DashboardProvider(manager)

      const routes: Record<string, Function> = {}
      const mockCore = {
        adapter: {
          get: mock(() => {}),
          post: mock((path: string, handler: Function) => {
            routes[path] = handler
          }),
        },
      }

      dashboard.registerRoutes(mockCore, '/_flux')

      let jsonResult: any = null
      const mockContext: any = {
        req: {
          json: mock(() => Promise.resolve({ queue: 'default', count: 5 })),
        },
        json: mock((data: any) => {
          jsonResult = data
          return data
        }),
      }

      await routes['/_flux/jobs/retry'](mockContext)

      expect(manager.retryFailed).toHaveBeenCalledWith('default', 5)
      expect(jsonResult.success).toBe(true)
      expect(jsonResult.retried).toBe(3)
    })

    it('should return error when queue is missing', async () => {
      const manager = createMockManager()
      const dashboard = new DashboardProvider(manager)

      const routes: Record<string, Function> = {}
      const mockCore = {
        adapter: {
          get: mock(() => {}),
          post: mock((path: string, handler: Function) => {
            routes[path] = handler
          }),
        },
      }

      dashboard.registerRoutes(mockCore, '/_flux')

      let statusCode: number | undefined
      const mockContext: any = {
        req: {
          json: mock(() => Promise.resolve({})),
        },
        json: mock((data: any, status?: number) => {
          statusCode = status
          return data
        }),
      }

      await routes['/_flux/jobs/retry'](mockContext)
      expect(statusCode).toBe(400)
    })

    it('should default count to 1', async () => {
      const manager = createMockManager()
      const dashboard = new DashboardProvider(manager)

      const routes: Record<string, Function> = {}
      const mockCore = {
        adapter: {
          get: mock(() => {}),
          post: mock((path: string, handler: Function) => {
            routes[path] = handler
          }),
        },
      }

      dashboard.registerRoutes(mockCore, '/_flux')

      const mockContext: any = {
        req: {
          json: mock(() => Promise.resolve({ queue: 'default' })),
        },
        json: mock((data: any) => data),
      }

      await routes['/_flux/jobs/retry'](mockContext)
      expect(manager.retryFailed).toHaveBeenCalledWith('default', 1)
    })
  })

  describe('GET /logs', () => {
    it('should return logs with persistence', async () => {
      const persistence = createMockPersistence()
      const manager = createMockManager({ persistence })
      const dashboard = new DashboardProvider(manager)

      const routes: Record<string, Function> = {}
      const mockCore = {
        adapter: {
          get: mock((path: string, handler: Function) => {
            routes[path] = handler
          }),
          post: mock(() => {}),
        },
      }

      dashboard.registerRoutes(mockCore, '/_flux')

      let jsonResult: any = null
      const mockContext: any = {
        req: {
          query: mock((key: string) => {
            if (key === 'limit') {
              return '50'
            }
            if (key === 'offset') {
              return '10'
            }
            if (key === 'level') {
              return 'error'
            }
            if (key === 'search') {
              return 'keyword'
            }
            return null
          }),
        },
        json: mock((data: any) => {
          jsonResult = data
          return data
        }),
      }

      await routes['/_flux/logs'](mockContext)

      expect(persistence.listLogs).toHaveBeenCalled()
      expect(persistence.countLogs).toHaveBeenCalled()
      expect(jsonResult.data).toBeDefined()
      expect(jsonResult.meta).toBeDefined()
    })

    it('should return error when persistence is not configured', async () => {
      const manager = createMockManager()
      const dashboard = new DashboardProvider(manager)

      const routes: Record<string, Function> = {}
      const mockCore = {
        adapter: {
          get: mock((path: string, handler: Function) => {
            routes[path] = handler
          }),
          post: mock(() => {}),
        },
      }

      dashboard.registerRoutes(mockCore, '/_flux')

      let statusCode: number | undefined
      const mockContext: any = {
        req: {
          query: mock(() => null),
        },
        json: mock((data: any, status?: number) => {
          statusCode = status
          return data
        }),
      }

      await routes['/_flux/logs'](mockContext)
      expect(statusCode).toBe(400)
    })

    it('should use defaults when no query params', async () => {
      const persistence = createMockPersistence()
      const manager = createMockManager({ persistence })
      const dashboard = new DashboardProvider(manager)

      const routes: Record<string, Function> = {}
      const mockCore = {
        adapter: {
          get: mock((path: string, handler: Function) => {
            routes[path] = handler
          }),
          post: mock(() => {}),
        },
      }

      dashboard.registerRoutes(mockCore, '/_flux')

      const mockContext: any = {
        req: {
          query: mock(() => null),
        },
        json: mock((data: any) => data),
      }

      await routes['/_flux/logs'](mockContext)
      expect(persistence.listLogs).toHaveBeenCalled()
    })
  })
})
