import { afterEach, beforeEach, describe, expect, it, jest, mock } from 'bun:test'
import type { WorkflowState } from '../src/types'

// 模擬 pg 模組
const mockQuery = jest.fn()
const mockEnd = jest.fn()
const MockPool = jest.fn(() => ({
  query: mockQuery,
  end: mockEnd,
}))

mock.module('pg', () => ({
  Pool: MockPool,
}))

// 必須在 mock 之後載入
const { PostgreSQLStorage } = await import('../src/storage/PostgreSQLStorage')

describe('PostgreSQLStorage (Mock)', () => {
  let storage: PostgreSQLStorage

  const createMockState = (overrides: Partial<WorkflowState> = {}): WorkflowState => ({
    id: 'wf-test-1',
    name: 'test-workflow',
    status: 'running',
    input: { orderId: '123' },
    data: { step1: 'done' },
    currentStep: 1,
    history: [
      {
        name: 'step1',
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        retries: 0,
      },
    ],
    createdAt: new Date('2024-06-01T00:00:00Z'),
    updatedAt: new Date('2024-06-01T01:00:00Z'),
    version: 1,
    ...overrides,
  })

  beforeEach(() => {
    mockQuery.mockReset()
    mockEnd.mockReset()
    MockPool.mockClear()

    // 預設 query 回傳成功
    mockQuery.mockResolvedValue({ rows: [] })

    storage = new PostgreSQLStorage({
      connectionString: 'postgresql://localhost:5432/test',
      tableName: 'test_workflows',
    })
  })

  afterEach(async () => {
    mockQuery.mockReset()
    mockEnd.mockReset()
  })

  describe('constructor', () => {
    it('should use default table name when not specified', () => {
      const defaultStorage = new PostgreSQLStorage()
      expect((defaultStorage as any).tableName).toBe('flux_workflows')
    })

    it('should use custom table name', () => {
      const customStorage = new PostgreSQLStorage({ tableName: 'my_workflows' })
      expect((customStorage as any).tableName).toBe('my_workflows')
    })
  })

  describe('init', () => {
    it('should create table and indexes on first init', async () => {
      await storage.init()

      // CREATE TABLE + 3 indexes = 4 calls
      expect(mockQuery).toHaveBeenCalledTimes(4)
      expect(mockQuery.mock.calls[0][0]).toContain('CREATE TABLE IF NOT EXISTS test_workflows')
      expect(mockQuery.mock.calls[1][0]).toContain('CREATE INDEX IF NOT EXISTS')
      expect(mockQuery.mock.calls[2][0]).toContain('CREATE INDEX IF NOT EXISTS')
      expect(mockQuery.mock.calls[3][0]).toContain('CREATE INDEX IF NOT EXISTS')
    })

    it('should be idempotent - skip on second call', async () => {
      await storage.init()
      const callsAfterFirst = mockQuery.mock.calls.length

      await storage.init()
      expect(mockQuery.mock.calls.length).toBe(callsAfterFirst)
    })

    it('should use host/port config when no connectionString', async () => {
      const hostStorage = new PostgreSQLStorage({
        host: 'db.example.com',
        port: 5433,
        database: 'mydb',
        user: 'testuser',
        password: 'testpass',
      })

      await hostStorage.init()

      expect(MockPool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'db.example.com',
          port: 5433,
          database: 'mydb',
          user: 'testuser',
          password: 'testpass',
        })
      )
    })

    it('should use default host/port/database when not specified', async () => {
      const minimalStorage = new PostgreSQLStorage({})

      await minimalStorage.init()

      expect(MockPool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'localhost',
          port: 5432,
          database: 'postgres',
        })
      )
    })

    it('should configure SSL when provided', async () => {
      const sslStorage = new PostgreSQLStorage({
        connectionString: 'postgresql://localhost/test',
        ssl: { rejectUnauthorized: false },
      })

      await sslStorage.init()

      expect(MockPool).toHaveBeenCalledWith(
        expect.objectContaining({
          ssl: { rejectUnauthorized: false },
        })
      )
    })

    it('should configure SSL boolean', async () => {
      const sslStorage = new PostgreSQLStorage({
        connectionString: 'postgresql://localhost/test',
        ssl: true,
      })

      await sslStorage.init()

      expect(MockPool).toHaveBeenCalledWith(
        expect.objectContaining({
          ssl: true,
        })
      )
    })
  })

  describe('save', () => {
    it('should upsert workflow state with correct parameters', async () => {
      const state = createMockState()

      await storage.save(state)

      // init (4 calls) + save (1 call)
      expect(mockQuery).toHaveBeenCalledTimes(5)

      const saveCall = mockQuery.mock.calls[4]
      expect(saveCall[0]).toContain('INSERT INTO test_workflows')
      expect(saveCall[0]).toContain('ON CONFLICT (id) DO UPDATE')

      const params = saveCall[1]
      expect(params[0]).toBe('wf-test-1')
      expect(params[1]).toBe('test-workflow')
      expect(params[2]).toBe('running')
      expect(JSON.parse(params[3])).toEqual({ orderId: '123' })
      expect(JSON.parse(params[4])).toEqual({ step1: 'done' })
      expect(params[5]).toBe(1)
      expect(params[7]).toBeNull() // error is null
    })

    it('should handle state with error', async () => {
      const state = createMockState({
        status: 'failed',
        error: 'Something went wrong',
      })

      await storage.save(state)

      const saveCall = mockQuery.mock.calls[4]
      const params = saveCall[1]
      expect(params[7]).toBe('Something went wrong')
    })

    it('should handle state with completedAt', async () => {
      const completedAt = new Date('2024-06-02T00:00:00Z')
      const state = createMockState({
        status: 'completed',
        completedAt,
      })

      await storage.save(state)

      const saveCall = mockQuery.mock.calls[4]
      const params = saveCall[1]
      expect(params[10]).toEqual(completedAt)
    })
  })

  describe('load', () => {
    it('should return null when workflow not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] })

      const result = await storage.load('non-existent')
      expect(result).toBeNull()
    })

    it('should convert row to WorkflowState correctly', async () => {
      const mockRow = {
        id: 'wf-1',
        name: 'test-workflow',
        status: 'completed',
        input: { key: 'value' },
        data: { result: 42 },
        current_step: 2,
        history: [{ name: 'step1', status: 'completed', retries: 0 }],
        error: null,
        created_at: '2024-06-01T00:00:00Z',
        updated_at: '2024-06-01T01:00:00Z',
        completed_at: '2024-06-02T00:00:00Z',
        version: 3,
      }

      // init 回傳空 rows，load 回傳 mockRow
      mockQuery.mockResolvedValueOnce({ rows: [] }) // CREATE TABLE
      mockQuery.mockResolvedValueOnce({ rows: [] }) // INDEX 1
      mockQuery.mockResolvedValueOnce({ rows: [] }) // INDEX 2
      mockQuery.mockResolvedValueOnce({ rows: [] }) // INDEX 3
      mockQuery.mockResolvedValueOnce({ rows: [mockRow] }) // SELECT

      const result = await storage.load('wf-1')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('wf-1')
      expect(result?.name).toBe('test-workflow')
      expect(result?.status).toBe('completed')
      expect(result?.input).toEqual({ key: 'value' })
      expect(result?.data).toEqual({ result: 42 })
      expect(result?.currentStep).toBe(2)
      expect(result?.error).toBeUndefined()
      expect(result?.version).toBe(3)
      expect(result?.completedAt).toBeInstanceOf(Date)
    })

    it('should handle string-encoded JSON fields', async () => {
      const mockRow = {
        id: 'wf-2',
        name: 'test',
        status: 'running',
        input: JSON.stringify({ key: 'value' }),
        data: JSON.stringify({ result: 42 }),
        current_step: 0,
        history: JSON.stringify([]),
        error: 'test error',
        created_at: '2024-06-01T00:00:00Z',
        updated_at: '2024-06-01T01:00:00Z',
        completed_at: null,
        version: 1,
      }

      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: [mockRow] })

      const result = await storage.load('wf-2')

      expect(result?.input).toEqual({ key: 'value' })
      expect(result?.data).toEqual({ result: 42 })
      expect(result?.history).toEqual([])
      expect(result?.error).toBe('test error')
      expect(result?.completedAt).toBeUndefined()
    })
  })

  describe('list', () => {
    it('should list all workflows without filter', async () => {
      const mockRows = [
        {
          id: '1',
          name: 'wf',
          status: 'completed',
          input: {},
          data: {},
          current_step: 0,
          history: [],
          error: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          completed_at: null,
          version: 1,
        },
      ]

      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: mockRows })

      const results = await storage.list()
      expect(results).toHaveLength(1)
    })

    it('should filter by name', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: [] })

      await storage.list({ name: 'order-flow' })

      const listCall = mockQuery.mock.calls[4]
      expect(listCall[0]).toContain('AND name = $1')
      expect(listCall[1]).toContain('order-flow')
    })

    it('should filter by single status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: [] })

      await storage.list({ status: 'completed' })

      const listCall = mockQuery.mock.calls[4]
      expect(listCall[0]).toContain('AND status = $1')
      expect(listCall[1]).toContain('completed')
    })

    it('should filter by multiple statuses', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: [] })

      await storage.list({ status: ['running', 'failed'] })

      const listCall = mockQuery.mock.calls[4]
      expect(listCall[0]).toContain('AND status IN ($1, $2)')
      expect(listCall[1]).toEqual(['running', 'failed'])
    })

    it('should apply limit and offset', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: [] })

      await storage.list({ limit: 10, offset: 5 })

      const listCall = mockQuery.mock.calls[4]
      expect(listCall[0]).toContain('LIMIT')
      expect(listCall[0]).toContain('OFFSET')
      expect(listCall[1]).toContain(10)
      expect(listCall[1]).toContain(5)
    })

    it('should combine name, status, limit, and offset filters', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: [] })
      mockQuery.mockResolvedValueOnce({ rows: [] })

      await storage.list({
        name: 'order-flow',
        status: 'running',
        limit: 20,
        offset: 10,
      })

      const listCall = mockQuery.mock.calls[4]
      expect(listCall[0]).toContain('AND name = $1')
      expect(listCall[0]).toContain('AND status = $2')
      expect(listCall[0]).toContain('LIMIT $3')
      expect(listCall[0]).toContain('OFFSET $4')
    })
  })

  describe('delete', () => {
    it('should delete workflow by id', async () => {
      await storage.delete('wf-to-delete')

      const deleteCall = mockQuery.mock.calls[4]
      expect(deleteCall[0]).toContain('DELETE FROM test_workflows WHERE id = $1')
      expect(deleteCall[1]).toEqual(['wf-to-delete'])
    })
  })

  describe('close', () => {
    it('should close the pool', async () => {
      await storage.init()
      await storage.close()

      expect(mockEnd).toHaveBeenCalledTimes(1)
      expect((storage as any).initialized).toBe(false)
    })

    it('should handle close when pool is not initialized', async () => {
      // 未執行 init，pool 為 undefined
      const freshStorage = new PostgreSQLStorage()
      await freshStorage.close()
      // 不應拋出錯誤
    })
  })

  describe('getPool', () => {
    it('should return the pool after init', async () => {
      await storage.init()
      const pool = storage.getPool()
      expect(pool).toBeDefined()
      expect(pool.query).toBeDefined()
    })

    it('should return undefined before init', () => {
      const freshStorage = new PostgreSQLStorage()
      const pool = freshStorage.getPool()
      expect(pool).toBeUndefined()
    })
  })

  describe('vacuum', () => {
    it('should run VACUUM ANALYZE', async () => {
      await storage.vacuum()

      // init (4 calls) + VACUUM (1 call)
      const vacuumCall = mockQuery.mock.calls[4]
      expect(vacuumCall[0]).toContain('VACUUM ANALYZE')
    })
  })
})
