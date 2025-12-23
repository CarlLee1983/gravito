/**
 * @fileoverview Tests for BunSQLiteStorage
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { BunSQLiteStorage } from '../src/storage/BunSQLiteStorage'
import type { WorkflowState } from '../src/types'

describe('BunSQLiteStorage', () => {
  let storage: BunSQLiteStorage

  beforeEach(async () => {
    storage = new BunSQLiteStorage() // In-memory
    await storage.init()
  })

  afterEach(async () => {
    await storage.close()
  })

  it('should initialize tables', async () => {
    const db = storage.getDatabase()
    const tables = db
      .query(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='flux_workflows'
    `)
      .all()

    expect(tables).toHaveLength(1)
  })

  it('should save and load state', async () => {
    const state: WorkflowState = {
      id: 'sqlite-test-1',
      name: 'test-workflow',
      status: 'running',
      input: { foo: 'bar' },
      data: { result: 42 },
      currentStep: 1,
      history: [{ name: 'step1', status: 'completed', retries: 0 }],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await storage.save(state)
    const loaded = await storage.load('sqlite-test-1')

    expect(loaded).not.toBeNull()
    expect(loaded?.id).toBe('sqlite-test-1')
    expect(loaded?.name).toBe('test-workflow')
    expect(loaded?.input).toEqual({ foo: 'bar' })
    expect(loaded?.data).toEqual({ result: 42 })
    expect(loaded?.history).toHaveLength(1)
  })

  it('should update existing state', async () => {
    const state: WorkflowState = {
      id: 'update-test',
      name: 'test',
      status: 'pending',
      input: {},
      data: {},
      currentStep: 0,
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await storage.save(state)

    state.status = 'completed'
    state.data = { done: true }
    await storage.save(state)

    const loaded = await storage.load('update-test')
    expect(loaded?.status).toBe('completed')
    expect(loaded?.data).toEqual({ done: true })
  })

  it('should list with filters', async () => {
    await storage.save({
      id: '1',
      name: 'workflow-a',
      status: 'completed',
      input: {},
      data: {},
      currentStep: 0,
      history: [],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date(),
    })

    await storage.save({
      id: '2',
      name: 'workflow-b',
      status: 'running',
      input: {},
      data: {},
      currentStep: 0,
      history: [],
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date(),
    })

    const completed = await storage.list({ status: 'completed' })
    expect(completed).toHaveLength(1)
    expect(completed[0]?.id).toBe('1')

    const byName = await storage.list({ name: 'workflow-b' })
    expect(byName).toHaveLength(1)
    expect(byName[0]?.status).toBe('running')

    const limited = await storage.list({ limit: 1 })
    expect(limited).toHaveLength(1)
  })

  it('should delete state', async () => {
    await storage.save({
      id: 'delete-me',
      name: 'test',
      status: 'pending',
      input: {},
      data: {},
      currentStep: 0,
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await storage.delete('delete-me')
    const loaded = await storage.load('delete-me')
    expect(loaded).toBeNull()
  })

  it('should handle custom table name', async () => {
    const customStorage = new BunSQLiteStorage({ tableName: 'custom_workflows' })
    await customStorage.init()

    const db = customStorage.getDatabase()
    const tables = db
      .query(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='custom_workflows'
    `)
      .all()

    expect(tables).toHaveLength(1)
    await customStorage.close()
  })
})
