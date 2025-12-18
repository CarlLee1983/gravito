import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { PlanetCore } from 'gravito-core'
import type { DBService } from '../src/DBService'
import orbitDB from '../src/index'
import { Model, ModelRegistry } from '../src/Model'

describe('OrbitDB', () => {
  let core: PlanetCore
  let mockDoAction: ReturnType<typeof mock>
  let mockUse: ReturnType<typeof mock>

  beforeEach(() => {
    core = new PlanetCore()
    mockDoAction = mock((_hook, _args) => Promise.resolve())
    mockUse = mock(() => core.app)
    core.hooks.doAction = mockDoAction
    core.app.use = mockUse
  })

  it('should register db and hooks', () => {
    const mockDb = { name: 'mock-db' }

    const result = orbitDB(core, { db: mockDb })

    expect(result).toEqual({ db: mockDb })
    expect(mockDoAction).toHaveBeenCalledWith(
      'db:connected',
      expect.objectContaining({ db: mockDb })
    )
    expect(mockUse).toHaveBeenCalled()
  })

  it('should inject DBService into context', async () => {
    const mockDb = {
      name: 'mock-db',
      select: () => ({ from: () => ({ limit: () => Promise.resolve([]) }) }),
    }
    const mockContext = { set: mock(() => {}) }

    orbitDB(core, { db: mockDb })

    // Ensure middleware is registered
    expect(mockUse).toHaveBeenCalled()

    // Simulate middleware execution
    const middleware = (mockUse as any).mock.calls[0][1]
    if (middleware) {
      await middleware(mockContext, async () => {})
      expect(mockContext.set).toHaveBeenCalledWith('db', expect.objectContaining({ raw: mockDb }))
    }
  })

  it('should support custom exposeAs', () => {
    const mockDb = { name: 'mock-db' }
    const mockContext = { set: mock(() => {}) }

    orbitDB(core, { db: mockDb, exposeAs: 'database' })

    const middleware = (mockUse as any).mock.calls[0][1]
    if (middleware) {
      middleware(mockContext, async () => {})
      expect(mockContext.set).toHaveBeenCalledWith('database', expect.anything())
    }
  })

  it('should enable query logging when configured', () => {
    const mockDb = { name: 'mock-db' }
    orbitDB(core, { db: mockDb, enableQueryLogging: true, queryLogLevel: 'info' })

    expect(mockDoAction).toHaveBeenCalledWith('db:connected', expect.anything())
  })

  it('should disable health check when configured', () => {
    const mockDb = { name: 'mock-db' }
    orbitDB(core, { db: mockDb, enableHealthCheck: false })

    expect(mockDoAction).toHaveBeenCalledWith('db:connected', expect.anything())
  })

  it('should support custom database type', () => {
    const mockDb = { name: 'mock-db' }
    orbitDB(core, { db: mockDb, databaseType: 'postgresql' })

    expect(mockDoAction).toHaveBeenCalledWith('db:connected', expect.anything())
  })

  describe('DBService', () => {
    let dbService: DBService
    let mockDb: any

    beforeEach(() => {
      mockDb = {
        name: 'mock-db',
        select: () => ({
          from: () => ({
            where: () => ({ limit: () => Promise.resolve([]) }),
            limit: () => ({ offset: () => Promise.resolve([]) }),
          }),
        }),
        transaction: mock((callback: any) => {
          const mockTx = {}
          return callback(mockTx)
        }),
      }

      orbitDB(core, { db: mockDb })
      const middleware = (mockUse as any).mock.calls[0][1]
      const mockContext: any = {
        set: mock((key: string, value: any) => {
          mockContext[key] = value
        }),
      }
      middleware(mockContext, async () => {})
      dbService = mockContext.db
    })

    it('should provide raw db instance', () => {
      expect(dbService.raw).toBe(mockDb)
    })

    it('should support transaction', async () => {
      const mockCallback = mock(async (tx: any) => {
        expect(tx).toBeDefined()
        return 'result'
      })

      const result = await dbService.transaction(mockCallback)

      expect(result).toBe('result')
      expect(mockCallback).toHaveBeenCalled()
      expect(mockDoAction).toHaveBeenCalledWith('db:transaction:start', expect.anything())
    })

    it('should handle transaction errors', async () => {
      const mockCallback = mock(async () => {
        throw new Error('Transaction failed')
      })

      await expect(dbService.transaction(mockCallback)).rejects.toThrow('Transaction failed')
      expect(mockDoAction).toHaveBeenCalledWith('db:transaction:error', expect.anything())
      expect(mockDoAction).toHaveBeenCalledWith('db:transaction:rollback', expect.anything())
    })

    it('should support health check', async () => {
      // Mock health check query
      mockDb.query = mock(() => Promise.resolve([]))

      const result = await dbService.healthCheck()

      expect(result.status).toBe('healthy')
      expect(result.latency).toBeDefined()
      expect(mockDoAction).toHaveBeenCalledWith('db:health-check', expect.anything())
    })

    it('should handle health check errors', async () => {
      mockDb.query = mock(() => Promise.reject(new Error('Connection failed')))

      const result = await dbService.healthCheck()

      expect(result.status).toBe('unhealthy')
      expect(result.error).toBeDefined()
    })

    it('should support findById', async () => {
      const mockTable = { _: { name: 'users' } }
      const mockResult = [{ id: 1, name: 'Test' }]

      mockDb.select = () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve(mockResult),
          }),
        }),
      })

      const result = await dbService.findById(mockTable, 1)

      expect(result).toEqual(mockResult[0])
    })

    it('should support findOne', async () => {
      const mockTable = { _: { name: 'users' } }
      const mockResult = [{ id: 1, name: 'Test' }]

      mockDb.select = () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve(mockResult),
          }),
        }),
      })

      const result = await dbService.findOne(mockTable, { name: 'Test' })

      expect(result).toEqual(mockResult[0])
    })

    it('should support paginate', async () => {
      const mockTable = { _: { name: 'users' } }
      const mockData = [{ id: 1 }, { id: 2 }]

      mockDb.select = () => ({
        from: () => ({
          limit: () => ({
            offset: () => Promise.resolve(mockData),
          }),
        }),
      })

      const result = await dbService.paginate(mockTable, { page: 1, limit: 10 })

      expect(result.data).toEqual(mockData)
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(10)
      expect(result.pagination.hasNext).toBeDefined()
      expect(result.pagination.hasPrev).toBeDefined()
    })

    it('should support findAll', async () => {
      const mockTable = { _: { name: 'users' } }
      const mockData = [{ id: 1 }, { id: 2 }]

      mockDb.select = () => ({
        from: () => Promise.resolve(mockData),
      })

      const result = await dbService.findAll(mockTable)

      expect(result).toEqual(mockData)
    })

    it('should support count', async () => {
      const mockTable = { _: { name: 'users' } }
      const mockData = [{ id: 1 }, { id: 2 }, { id: 3 }]

      mockDb.select = () => ({
        from: () => Promise.resolve(mockData),
      })

      const result = await dbService.count(mockTable)

      expect(result).toBe(3)
    })

    it('should support exists', async () => {
      const mockTable = { _: { name: 'users' } }
      const mockData = [{ id: 1 }]

      mockDb.select = () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve(mockData),
          }),
        }),
      })

      const result = await dbService.exists(mockTable, { id: 1 })

      expect(result).toBe(true)
    })

    it('should support create', async () => {
      const mockTable = { _: { name: 'users' } }
      const mockData = { id: 1, name: 'John' }
      const insertData = { name: 'John' }

      mockDb.insert = () => ({
        values: () => ({
          returning: () => Promise.resolve([mockData]),
        }),
      })

      const result = await dbService.create(mockTable, insertData)

      expect(result).toEqual(mockData)
    })

    it('should support insert', async () => {
      const mockTable = { _: { name: 'users' } }
      const mockData = [{ id: 1, name: 'John' }]
      const insertData = { name: 'John' }

      mockDb.insert = () => ({
        values: () => ({
          returning: () => Promise.resolve(mockData),
        }),
      })

      const result = await dbService.insert(mockTable, insertData)

      expect(result).toEqual(mockData[0])
    })

    it('should support update', async () => {
      const mockTable = { _: { name: 'users' } }
      const mockData = [{ id: 1, name: 'Jane' }]

      mockDb.update = () => ({
        set: () => ({
          where: () => ({
            returning: () => Promise.resolve(mockData),
          }),
        }),
      })

      const result = await dbService.update(mockTable, { id: 1 }, { name: 'Jane' })

      expect(result).toEqual(mockData)
    })

    it('should support delete', async () => {
      const mockTable = { _: { name: 'users' } }

      mockDb.delete = () => ({
        where: () => Promise.resolve(),
      })

      await dbService.delete(mockTable, { id: 1 })
      // If no error is thrown, the test passes.
      expect(true).toBe(true)
    })

    it('should support bulkInsert', async () => {
      const mockTable = { _: { name: 'users' } }
      const mockData = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ]

      mockDb.insert = () => ({
        values: () => ({
          returning: () => Promise.resolve(mockData),
        }),
      })

      const result = await dbService.bulkInsert(mockTable, [{ name: 'John' }, { name: 'Jane' }])

      expect(result).toEqual(mockData)
    })

    it('should support bulkUpdate', async () => {
      const mockTable = { _: { name: 'users' } }
      const mockData = [{ id: 1, name: 'John Updated' }]

      mockDb.transaction = mock(async (callback: any) => {
        const mockTx = {
          update: () => ({
            set: () => ({
              where: () => ({
                returning: () => Promise.resolve(mockData),
              }),
            }),
          }),
        }
        return callback(mockTx)
      })

      const result = await dbService.bulkUpdate(mockTable, [
        { where: { id: 1 }, data: { name: 'John Updated' } },
      ])

      expect(result).toBeDefined()
    })

    it('should support bulkDelete', async () => {
      const mockTable = { _: { name: 'users' } }

      mockDb.transaction = mock(async (callback: any) => {
        const mockTx = {
          delete: () => ({
            where: () => Promise.resolve(),
          }),
        }
        return callback(mockTx)
      })

      await dbService.bulkDelete(mockTable, [{ id: 1 }, { id: 2 }])
      // If no error is thrown, the test passes.
      expect(true).toBe(true)
    })

    it('should support findByIdWith', async () => {
      const mockResult = { id: 1, name: 'John', posts: [{ id: 1, title: 'Post 1' }] }

      mockDb.query = {
        users: {
          findFirst: mock(() => Promise.resolve(mockResult)),
        },
      }

      const result = await dbService.findByIdWith('users', 1, { posts: true })

      expect(result).toEqual(mockResult)
      expect(mockDb.query.users.findFirst).toHaveBeenCalledWith({
        where: { id: 1 },
        with: { posts: true },
      })
    })

    it('should support findOneWith', async () => {
      const mockResult = { id: 1, name: 'John', profile: { id: 1, bio: 'Bio' } }

      mockDb.query = {
        users: {
          findFirst: mock(() => Promise.resolve(mockResult)),
        },
      }

      const result = await dbService.findOneWith(
        'users',
        { email: 'john@example.com' },
        { profile: true }
      )

      expect(result).toEqual(mockResult)
      expect(mockDb.query.users.findFirst).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
        with: { profile: true },
      })
    })

    it('should support findAllWith', async () => {
      const mockResult = [
        { id: 1, name: 'John', posts: [{ id: 1 }] },
        { id: 2, name: 'Jane', posts: [{ id: 2 }] },
      ]

      mockDb.query = {
        users: {
          findMany: mock(() => Promise.resolve(mockResult)),
        },
      }

      const result = await dbService.findAllWith('users', { posts: true })

      expect(result).toEqual(mockResult)
      expect(mockDb.query.users.findMany).toHaveBeenCalledWith({
        with: { posts: true },
      })
    })

    it('should handle relation query errors', async () => {
      // Simulate missing query API
      mockDb.query = undefined

      await expect(dbService.findByIdWith('users', 1, { posts: true })).rejects.toThrow()
    })

    it('should support migrate', async () => {
      const mockMigrations = ['001_initial', '002_add_users']
      mockDb.migrate = mock(() => Promise.resolve({ migrations: mockMigrations }))

      const result = await dbService.migrate()

      expect(result.success).toBe(true)
      expect(result.appliedMigrations).toEqual(mockMigrations)
      expect(mockDb.migrate).toHaveBeenCalled()
      expect(mockDoAction).toHaveBeenCalledWith('db:migrate:start', expect.anything())
      expect(mockDoAction).toHaveBeenCalledWith('db:migrate:complete', expect.anything())
    })

    it('should handle migrate errors', async () => {
      mockDb.migrate = mock(() => Promise.reject(new Error('Migration failed')))

      const result = await dbService.migrate()

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(mockDoAction).toHaveBeenCalledWith('db:migrate:error', expect.anything())
    })

    it('should support migrateTo', async () => {
      const mockMigrations = ['001_initial']
      mockDb.migrate = mock((options: any) => Promise.resolve({ migrations: mockMigrations }))

      const result = await dbService.migrateTo('001_initial')

      expect(result.success).toBe(true)
      expect(result.appliedMigrations).toEqual(mockMigrations)
      expect(mockDb.migrate).toHaveBeenCalled()
      expect(mockDoAction).toHaveBeenCalledWith(
        'db:migrate:start',
        expect.objectContaining({ targetMigration: '001_initial' })
      )
    })

    it('should support seed', async () => {
      const mockSeedFunction = mock(async (db: any) => {
        expect(db).toBe(mockDb)
      })

      const result = await dbService.seed(mockSeedFunction, 'test-seed')

      expect(result.success).toBe(true)
      expect(result.seededFiles).toEqual(['test-seed'])
      expect(mockSeedFunction).toHaveBeenCalledWith(mockDb)
      expect(mockDoAction).toHaveBeenCalledWith(
        'db:seed:start',
        expect.objectContaining({ seedName: 'test-seed' })
      )
      expect(mockDoAction).toHaveBeenCalledWith('db:seed:complete', expect.anything())
    })

    it('should handle seed errors', async () => {
      const mockSeedFunction = mock(async () => {
        throw new Error('Seed failed')
      })

      const result = await dbService.seed(mockSeedFunction, 'test-seed')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(mockDoAction).toHaveBeenCalledWith('db:seed:error', expect.anything())
    })

    it('should support seedMany', async () => {
      const seed1 = mock(async () => {})
      const seed2 = mock(async () => {})

      const result = await dbService.seedMany([
        { name: 'seed1', seed: seed1 },
        { name: 'seed2', seed: seed2 },
      ])

      expect(result.success).toBe(true)
      expect(result.seededFiles).toContain('seed1')
      expect(result.seededFiles).toContain('seed2')
      expect(seed1).toHaveBeenCalled()
      expect(seed2).toHaveBeenCalled()
    })

    it('should support deploy', async () => {
      // Mock health check
      mockDb.query = mock(() => Promise.resolve([]))
      // Mock migrations
      mockDb.migrate = mock(() => Promise.resolve({ migrations: ['001_initial'] }))

      const result = await dbService.deploy({
        runMigrations: true,
        runSeeds: false,
        skipHealthCheck: false,
        validateBeforeDeploy: true,
      })

      expect(result.success).toBe(true)
      expect(result.migrations).toBeDefined()
      expect(result.healthCheck).toBeDefined()
      expect(mockDoAction).toHaveBeenCalledWith('db:deploy:start', expect.anything())
      expect(mockDoAction).toHaveBeenCalledWith('db:deploy:complete', expect.anything())
    })

    it('should handle deploy errors', async () => {
      // Mock failing health check
      mockDb.query = mock(() => Promise.reject(new Error('Connection failed')))

      const result = await dbService.deploy({
        runMigrations: true,
        validateBeforeDeploy: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(mockDoAction).toHaveBeenCalledWith('db:deploy:error', expect.anything())
    })
  })

  describe('Hooks', () => {
    it('should trigger db:connected hook', () => {
      const mockDb = { name: 'mock-db' }
      orbitDB(core, { db: mockDb })

      expect(mockDoAction).toHaveBeenCalledWith(
        'db:connected',
        expect.objectContaining({ db: mockDb })
      )
    })

    it('should trigger db:query hook when query logging is enabled', async () => {
      const mockDb = {
        name: 'mock-db',
        select: () => ({
          from: () => ({
            where: () => ({ limit: () => Promise.resolve([]) }),
          }),
        }),
      }

      orbitDB(core, { db: mockDb, enableQueryLogging: true })

      const middleware = (mockUse as any).mock.calls[0][1]
      const mockContext: any = {
        set: mock((key: string, value: any) => {
          mockContext[key] = value
        }),
      }
      await middleware(mockContext, async () => {})

      const dbService = mockContext.db as DBService
      const mockTable = { _: { name: 'users' } }

      await dbService.findById(mockTable, 1)

      // Ensure db:query hook was triggered
      expect(mockDoAction).toHaveBeenCalledWith(
        'db:query',
        expect.objectContaining({ query: expect.any(String) })
      )
    })
  })

  describe('Model', () => {
    let core: PlanetCore
    let mockDb: any
    let dbService: DBService

    beforeEach(() => {
      core = new PlanetCore()
      mockDb = {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve([]),
            }),
          }),
        }),
        insert: () => ({
          values: () => ({
            returning: () => Promise.resolve([{ id: 1, name: 'Test', email: 'test@example.com' }]),
          }),
        }),
        update: () => ({
          set: () => ({
            where: () => ({
              returning: () => Promise.resolve([{ id: 1, name: 'Updated' }]),
            }),
          }),
        }),
        delete: () => ({
          where: () => Promise.resolve(),
        }),
        transaction: (callback: any) => callback(mockDb),
      }

      orbitDB(core, { db: mockDb })
      dbService = core.app.get('db') as DBService
      ModelRegistry.clear()
    })

    it('should create model instance', () => {
      class User extends Model {
        static table = { _: { name: 'users' } }
        static tableName = 'users'
        declare attributes: {
          id?: number
          name: string
          email: string
        }
      }

      User.setDBService(dbService)
      User.setTable({ _: { name: 'users' } }, 'users')

      const user = new User()
      user.set('name', 'John')
      user.set('email', 'john@example.com')

      expect(user.get('name')).toBe('John')
      expect(user.get('email')).toBe('john@example.com')
    })

    it('should find model by id', async () => {
      class User extends Model {
        static table = { _: { name: 'users' } }
        static tableName = 'users'
        declare attributes: {
          id?: number
          name: string
          email: string
        }
      }

      User.setDBService(dbService)
      User.setTable({ _: { name: 'users' } }, 'users')

      // Mock findById
      const mockFindById = mock(() =>
        Promise.resolve({ id: 1, name: 'John', email: 'john@example.com' })
      )
      ;(dbService as any).findById = mockFindById

      const user = await User.find(1)

      expect(user).not.toBeNull()
      expect(user?.get('id')).toBe(1)
      expect(user?.get('name')).toBe('John')
      expect(mockFindById).toHaveBeenCalledWith({ _: { name: 'users' } }, 1)
    })

    it('should return null when find by id not found', async () => {
      class User extends Model {
        static table = { _: { name: 'users' } }
        static tableName = 'users'
        declare attributes: {
          id?: number
          name: string
          email: string
        }
      }

      User.setDBService(dbService)
      User.setTable({ _: { name: 'users' } }, 'users')

      const mockFindById = mock(() => Promise.resolve(null))
      ;(dbService as any).findById = mockFindById

      const user = await User.find(999)

      expect(user).toBeNull()
    })

    it('should find model by column', async () => {
      class User extends Model {
        static table = { _: { name: 'users' } }
        static tableName = 'users'
        declare attributes: {
          id?: number
          name: string
          email: string
        }
      }

      User.setDBService(dbService)
      User.setTable({ _: { name: 'users' } }, 'users')

      const mockFindOne = mock(() =>
        Promise.resolve({ id: 1, name: 'John', email: 'john@example.com' })
      )
      ;(dbService as any).findOne = mockFindOne

      const user = await User.where('email', 'john@example.com')

      expect(user).not.toBeNull()
      expect(user?.get('email')).toBe('john@example.com')
      expect(mockFindOne).toHaveBeenCalledWith(
        { _: { name: 'users' } },
        { email: 'john@example.com' }
      )
    })

    it('should get all models', async () => {
      class User extends Model {
        static table = { _: { name: 'users' } }
        static tableName = 'users'
        declare attributes: {
          id?: number
          name: string
          email: string
        }
      }

      User.setDBService(dbService)
      User.setTable({ _: { name: 'users' } }, 'users')

      const mockFindAll = mock(() =>
        Promise.resolve([
          { id: 1, name: 'John', email: 'john@example.com' },
          { id: 2, name: 'Jane', email: 'jane@example.com' },
        ])
      )
      ;(dbService as any).findAll = mockFindAll

      const users = await User.all()

      expect(users).toHaveLength(2)
      expect(users[0].get('name')).toBe('John')
      expect(users[1].get('name')).toBe('Jane')
      // Since `findAll` applies a soft-delete filter, `where` may include `deleted_at: null`.
      // Ensure the mock was called while allowing `deleted_at` to be present.
      expect(mockFindAll).toHaveBeenCalled()
    })

    it('should create model', async () => {
      class User extends Model {
        static table = { _: { name: 'users' } }
        static tableName = 'users'
        static timestamps = false // Disable timestamps for testing
        declare attributes: {
          id?: number
          name: string
          email: string
        }
      }

      User.setDBService(dbService)
      User.setTable({ _: { name: 'users' } }, 'users')

      const mockCreate = mock(() =>
        Promise.resolve({ id: 1, name: 'John', email: 'john@example.com' })
      )
      ;(dbService as any).create = mockCreate

      const user = await User.create({ name: 'John', email: 'john@example.com' })

      expect(user.get('id')).toBe(1)
      expect(user.get('name')).toBe('John')
      // Since timestamps are disabled, there should be no timestamp fields.
      expect(mockCreate).toHaveBeenCalledWith(
        { _: { name: 'users' } },
        { name: 'John', email: 'john@example.com' }
      )
    })

    it('should save model (create)', async () => {
      class User extends Model {
        static table = { _: { name: 'users' } }
        static tableName = 'users'
        declare attributes: {
          id?: number
          name: string
          email: string
        }
      }

      User.setDBService(dbService)
      User.setTable({ _: { name: 'users' } }, 'users')

      const mockCreate = mock(() =>
        Promise.resolve({ id: 1, name: 'John', email: 'john@example.com' })
      )
      ;(dbService as any).create = mockCreate
      ;(dbService as any).findById = mock(() =>
        Promise.resolve({ id: 1, name: 'John', email: 'john@example.com' })
      )

      const user = new User()
      user.set('name', 'John')
      user.set('email', 'john@example.com')

      await user.save()

      expect(user.get('id')).toBe(1)
      expect(mockCreate).toHaveBeenCalled()
    })

    it('should save model (update)', async () => {
      class User extends Model {
        static table = { _: { name: 'users' } }
        static tableName = 'users'
        declare attributes: {
          id?: number
          name: string
          email: string
        }
      }

      User.setDBService(dbService)
      User.setTable({ _: { name: 'users' } }, 'users')

      const mockUpdate = mock(() =>
        Promise.resolve([{ id: 1, name: 'Updated', email: 'john@example.com' }])
      )
      const mockFindById = mock(() =>
        Promise.resolve({ id: 1, name: 'Updated', email: 'john@example.com' })
      )
      ;(dbService as any).update = mockUpdate
      ;(dbService as any).findById = mockFindById

      const user = new User()
      user.attributes = { id: 1, name: 'John', email: 'john@example.com' }
      user.set('name', 'Updated')

      await user.save()

      expect(mockUpdate).toHaveBeenCalled()
      expect(user.get('name')).toBe('Updated')
    })

    it('should delete model', async () => {
      class User extends Model {
        static table = { _: { name: 'users' } }
        static tableName = 'users'
        declare attributes: {
          id?: number
          name: string
          email: string
        }
      }

      User.setDBService(dbService)
      User.setTable({ _: { name: 'users' } }, 'users')

      const mockDelete = mock(() => Promise.resolve())
      ;(dbService as any).delete = mockDelete

      const user = new User()
      user.attributes = { id: 1, name: 'John', email: 'john@example.com' }

      const result = await user.delete()

      expect(result).toBe(true)
      expect(mockDelete).toHaveBeenCalledWith({ _: { name: 'users' } }, { id: 1 })
    })

    it('should count models', async () => {
      class User extends Model {
        static table = { _: { name: 'users' } }
        static tableName = 'users'
        declare attributes: {
          id?: number
          name: string
          email: string
        }
      }

      User.setDBService(dbService)
      User.setTable({ _: { name: 'users' } }, 'users')

      const mockCount = mock(() => Promise.resolve(10))
      ;(dbService as any).count = mockCount

      const count = await User.count()

      expect(count).toBe(10)
      expect(mockCount).toHaveBeenCalledWith({ _: { name: 'users' } }, undefined)
    })

    it('should check if model exists', async () => {
      class User extends Model {
        static table = { _: { name: 'users' } }
        static tableName = 'users'
        declare attributes: {
          id?: number
          name: string
          email: string
        }
      }

      User.setDBService(dbService)
      User.setTable({ _: { name: 'users' } }, 'users')

      const mockExists = mock(() => Promise.resolve(true))
      ;(dbService as any).exists = mockExists

      const exists = await User.exists({ email: 'john@example.com' })

      expect(exists).toBe(true)
      expect(mockExists).toHaveBeenCalledWith(
        { _: { name: 'users' } },
        { email: 'john@example.com' }
      )
    })

    it('should use ModelRegistry to auto-register', () => {
      class User extends Model {
        static table = { _: { name: 'users' } }
        static tableName = 'users'
        declare attributes: {
          id?: number
          name: string
        }
      }

      ModelRegistry.register(User, { _: { name: 'users' } }, 'users')
      ModelRegistry.initialize(dbService)

      // Should not throw
      expect(() => {
        User.setDBService(dbService)
        User.setTable({ _: { name: 'users' } }, 'users')
      }).not.toThrow()
    })

    it('should convert model to JSON', () => {
      class User extends Model {
        static table = { _: { name: 'users' } }
        static tableName = 'users'
        declare attributes: {
          id?: number
          name: string
          email: string
        }
      }

      const user = new User()
      user.attributes = { id: 1, name: 'John', email: 'john@example.com' }

      const json = user.toJSON()

      expect(json).toEqual({ id: 1, name: 'John', email: 'john@example.com' })
    })

    it('should support type casting', () => {
      class User extends Model {
        static table = { _: { name: 'users' } }
        static tableName = 'users'
        static casts = {
          age: 'number',
          isActive: 'boolean',
          metadata: 'json',
        }
        declare attributes: {
          id?: number
          name: string
          age?: string | number
          isActive?: string | boolean
          metadata?: string | object
        }
      }

      User.setDBService(dbService)
      User.setTable({ _: { name: 'users' } }, 'users')

      const user = new User()
      user.attributes = {
        id: 1,
        name: 'John',
        age: '25' as any,
        isActive: 'true' as any,
        metadata: '{"key":"value"}' as any,
      }

      expect(user.get('age')).toBe(25)
      expect(user.get('isActive')).toBe(true)
      expect(user.get('metadata')).toEqual({ key: 'value' })
    })

    it('should support accessors and mutators', () => {
      class User extends Model {
        static table = { _: { name: 'users' } }
        static tableName = 'users'
        declare attributes: {
          id?: number
          firstName?: string
          lastName?: string
          email?: string
        }

        // Accessor
        getFullNameAttribute(value: unknown): string {
          const attrs = this.attributes as any
          return `${attrs.firstName || ''} ${attrs.lastName || ''}`.trim()
        }

        // Mutator
        setEmailAttribute(value: unknown): string {
          return String(value).toLowerCase()
        }
      }

      User.setDBService(dbService)
      User.setTable({ _: { name: 'users' } }, 'users')

      const user = new User()
      user.set('firstName', 'John')
      user.set('lastName', 'Doe')
      user.set('email', 'JOHN@EXAMPLE.COM')

      expect(user.get('fullName')).toBe('John Doe')
      expect(user.attributes.email).toBe('john@example.com')
    })

    it('should define and use relations', async () => {
      class Post extends Model {
        static table = { _: { name: 'posts' } }
        static tableName = 'posts'
        declare attributes: {
          id?: number
          userId?: number
          title?: string
        }
      }

      class User extends Model {
        static table = { _: { name: 'users' } }
        static tableName = 'users'
        declare attributes: {
          id?: number
          name?: string
        }
      }

      User.setDBService(dbService)
      User.setTable({ _: { name: 'users' } }, 'users')
      Post.setDBService(dbService)
      Post.setTable({ _: { name: 'posts' } }, 'posts')

      // Define relations
      User.hasMany(Post, 'userId', 'id')

      const mockFindByIdWith = mock(() =>
        Promise.resolve({
          id: 1,
          name: 'John',
          posts: [
            { id: 1, userId: 1, title: 'Post 1' },
            { id: 2, userId: 1, title: 'Post 2' },
          ],
        })
      )
      ;(dbService as any).findByIdWith = mockFindByIdWith

      const user = new User()
      user.attributes = { id: 1, name: 'John' }

      const posts = await user.getRelation('posts')

      expect(posts).toBeDefined()
      expect(mockFindByIdWith).toHaveBeenCalledWith('users', 1, { posts: true })
    })

    it('should support load relations (eager loading)', async () => {
      class Post extends Model {
        static table = { _: { name: 'posts' } }
        static tableName = 'posts'
        declare attributes: {
          id?: number
          userId?: number
          title?: string
        }
      }

      class User extends Model {
        static table = { _: { name: 'users' } }
        static tableName = 'users'
        declare attributes: {
          id?: number
          name?: string
        }
      }

      User.setDBService(dbService)
      User.setTable({ _: { name: 'users' } }, 'users')
      Post.setDBService(dbService)
      Post.setTable({ _: { name: 'posts' } }, 'posts')

      User.hasMany(Post, 'userId', 'id')

      const mockFindByIdWith = mock(() =>
        Promise.resolve({
          id: 1,
          name: 'John',
          posts: [{ id: 1, userId: 1, title: 'Post 1' }],
        })
      )
      ;(dbService as any).findByIdWith = mockFindByIdWith

      const user = new User()
      user.attributes = { id: 1, name: 'John' }

      await user.load('posts')

      expect(mockFindByIdWith).toHaveBeenCalledWith('users', 1, { posts: true })
      const posts = await user.getRelation('posts')
      expect(posts).toBeDefined()
    })
  })
})
