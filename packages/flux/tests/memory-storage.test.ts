import { beforeEach, describe, expect, it } from 'bun:test'
import { MemoryStorage } from '../src/storage/MemoryStorage'
import type { WorkflowState } from '../src/types'

describe('MemoryStorage boundary cases', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = new MemoryStorage()
  })

  it('should handle missing workflowId in load', async () => {
    const result = await storage.load('non-existent')
    expect(result).toBeNull()
  })

  it('should handle empty filter in list', async () => {
    const states: WorkflowState[] = [
      {
        id: '1',
        name: 'a',
        status: 'running',
        input: {},
        data: {},
        currentStep: 0,
        history: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      },
      {
        id: '2',
        name: 'b',
        status: 'completed',
        input: {},
        data: {},
        currentStep: 0,
        history: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      },
    ]
    await storage.save(states[0])
    await storage.save(states[1])

    const list = await storage.list({})
    expect(list).toHaveLength(2)
  })

  it('should filter by multiple statuses', async () => {
    await storage.save({
      id: '1',
      name: 'a',
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
      name: 'b',
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
      name: 'c',
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
    expect(list).toHaveLength(2)
    const ids = list.map((s) => s.id)
    expect(ids).toContain('1')
    expect(ids).toContain('3')
  })

  it('should respect limit and offset', async () => {
    for (let i = 0; i < 10; i++) {
      await storage.save({
        id: `${i}`,
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
    }

    const list = await storage.list({ limit: 5, offset: 2 })
    expect(list).toHaveLength(5)
  })

  it('should return empty array when no matches', async () => {
    const list = await storage.list({ name: 'missing' })
    expect(list).toEqual([])
  })

  it('should work after close()', async () => {
    await storage.init?.()
    await storage.close?.()

    await storage.save({
      id: '1',
      name: 'test',
      status: 'pending',
      input: {},
      data: {},
      currentStep: 0,
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    })
    expect(await storage.load('1')).toBeDefined()
  })
})
