import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { PostgreSQLStorage } from '../src/storage/PostgreSQLStorage'
import type { WorkflowState } from '../src/types'

const hasPostgreSQL =
  process.env.POSTGRES_URL !== undefined || process.env.TEST_POSTGRESQL === 'true'

const describeIfPostgreSQL = hasPostgreSQL ? describe : describe.skip

describeIfPostgreSQL('PostgreSQLStorage', () => {
  let storage: PostgreSQLStorage

  beforeEach(async () => {
    const connectionString = process.env.POSTGRES_URL ?? 'postgresql://localhost:5432/flux_test'
    storage = new PostgreSQLStorage({
      connectionString,
      tableName: `test_workflows_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    })
    await storage.init()
  })

  afterEach(async () => {
    const pool = storage.getPool()
    if (pool) {
      await pool.query(`DROP TABLE IF EXISTS ${(storage as any).tableName}`)
    }
    await storage.close()
  })

  it('should save and load a workflow state', async () => {
    const state: WorkflowState = {
      id: 'test-1',
      name: 'test-workflow',
      status: 'running',
      input: { orderId: '123' },
      data: { step1Result: 'done' },
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
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    }

    await storage.save(state)
    const loaded = await storage.load('test-1')

    expect(loaded).not.toBeNull()
    expect(loaded?.id).toBe('test-1')
    expect(loaded?.name).toBe('test-workflow')
    expect(loaded?.status).toBe('running')
    expect(loaded?.input).toEqual({ orderId: '123' })
    expect(loaded?.data).toEqual({ step1Result: 'done' })
  })

  it('should update existing workflow state', async () => {
    const state: WorkflowState = {
      id: 'test-2',
      name: 'test-workflow',
      status: 'running',
      input: {},
      data: {},
      currentStep: 0,
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    }

    await storage.save(state)

    const updatedState = {
      ...state,
      status: 'completed' as const,
      version: 2,
      completedAt: new Date(),
    }
    await storage.save(updatedState)

    const loaded = await storage.load('test-2')
    expect(loaded?.status).toBe('completed')
    expect(loaded?.version).toBe(2)
    expect(loaded?.completedAt).toBeDefined()
  })

  it('should return null for non-existent workflow', async () => {
    const result = await storage.load('non-existent')
    expect(result).toBeNull()
  })

  it('should list workflows with empty filter', async () => {
    await storage.save({
      id: '1',
      name: 'wf-a',
      status: 'running',
      input: {},
      data: {},
      currentStep: 0,
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    })
    await storage.save({
      id: '2',
      name: 'wf-b',
      status: 'completed',
      input: {},
      data: {},
      currentStep: 0,
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    })

    const list = await storage.list({})
    expect(list.length).toBeGreaterThanOrEqual(2)
  })

  it('should filter by workflow name', async () => {
    await storage.save({
      id: '1',
      name: 'order-flow',
      status: 'running',
      input: {},
      data: {},
      currentStep: 0,
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    })
    await storage.save({
      id: '2',
      name: 'payment-flow',
      status: 'running',
      input: {},
      data: {},
      currentStep: 0,
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    })

    const list = await storage.list({ name: 'order-flow' })
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('order-flow')
  })

  it('should filter by single status', async () => {
    await storage.save({
      id: '1',
      name: 'test',
      status: 'running',
      input: {},
      data: {},
      currentStep: 0,
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    })
    await storage.save({
      id: '2',
      name: 'test',
      status: 'completed',
      input: {},
      data: {},
      currentStep: 0,
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    })

    const list = await storage.list({ status: 'completed' })
    expect(list.length).toBeGreaterThanOrEqual(1)
    expect(list.every((s) => s.status === 'completed')).toBe(true)
  })

  it('should filter by multiple statuses', async () => {
    await storage.save({
      id: '1',
      name: 'test',
      status: 'running',
      input: {},
      data: {},
      currentStep: 0,
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    })
    await storage.save({
      id: '2',
      name: 'test',
      status: 'completed',
      input: {},
      data: {},
      currentStep: 0,
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    })
    await storage.save({
      id: '3',
      name: 'test',
      status: 'failed',
      input: {},
      data: {},
      currentStep: 0,
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    })

    const list = await storage.list({ status: ['running', 'failed'] })
    expect(list.length).toBeGreaterThanOrEqual(2)
    const ids = list.map((s) => s.id)
    expect(ids).toContain('1')
    expect(ids).toContain('3')
  })

  it('should respect limit and offset', async () => {
    for (let i = 0; i < 10; i++) {
      await storage.save({
        id: `limit-test-${i}`,
        name: 'pagination-test',
        status: 'completed',
        input: {},
        data: {},
        currentStep: 0,
        history: [],
        createdAt: new Date(Date.now() - i * 1000),
        updatedAt: new Date(),
        version: 1,
      })
    }

    const list = await storage.list({ name: 'pagination-test', limit: 5, offset: 2 })
    expect(list).toHaveLength(5)
  })

  it('should delete workflow', async () => {
    await storage.save({
      id: 'delete-test',
      name: 'test',
      status: 'completed',
      input: {},
      data: {},
      currentStep: 0,
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    })

    const beforeDelete = await storage.load('delete-test')
    expect(beforeDelete).not.toBeNull()

    await storage.delete('delete-test')

    const afterDelete = await storage.load('delete-test')
    expect(afterDelete).toBeNull()
  })

  it('should handle complex JSON data', async () => {
    const complexData = {
      nested: {
        array: [1, 2, 3],
        object: { key: 'value' },
        null: null,
        boolean: true,
      },
    }

    await storage.save({
      id: 'json-test',
      name: 'test',
      status: 'running',
      input: complexData,
      data: complexData,
      currentStep: 0,
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    })

    const loaded = await storage.load('json-test')
    expect(loaded?.input).toEqual(complexData)
    expect(loaded?.data).toEqual(complexData)
  })

  it('should handle workflow with error', async () => {
    await storage.save({
      id: 'error-test',
      name: 'test',
      status: 'failed',
      input: {},
      data: {},
      currentStep: 0,
      history: [],
      error: 'Something went wrong',
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    })

    const loaded = await storage.load('error-test')
    expect(loaded?.error).toBe('Something went wrong')
  })

  it('should preserve dates correctly', async () => {
    const createdAt = new Date('2024-01-01T00:00:00Z')
    const updatedAt = new Date('2024-01-02T00:00:00Z')
    const completedAt = new Date('2024-01-03T00:00:00Z')

    await storage.save({
      id: 'date-test',
      name: 'test',
      status: 'completed',
      input: {},
      data: {},
      currentStep: 0,
      history: [],
      createdAt,
      updatedAt,
      completedAt,
      version: 1,
    })

    const loaded = await storage.load('date-test')
    expect(loaded?.createdAt.toISOString()).toBe(createdAt.toISOString())
    expect(loaded?.completedAt?.toISOString()).toBe(completedAt.toISOString())
  })
})
