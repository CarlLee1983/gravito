import { describe, expect, it, mock } from 'bun:test'
import { DatabaseDriver } from '../src/drivers/DatabaseDriver'
import { MemoryDriver } from '../src/drivers/MemoryDriver'
import { RedisDriver } from '../src/drivers/RedisDriver'
import type { SerializedJob } from '../src/types'

describe('Phase 4 Optimizations', () => {
  describe('MemoryDriver', () => {
    it('should enforce maxSize', async () => {
      const driver = new MemoryDriver({ maxSize: 2 })
      const job: SerializedJob = { id: '1', type: 'json', data: '{}', createdAt: Date.now() }

      await driver.push('q1', { ...job, id: '1' })
      await driver.push('q1', { ...job, id: '2' })

      expect(driver.size('q1')).resolves.toBe(2)

      // Should throw
      try {
        await driver.push('q1', { ...job, id: '3' })
        expect(true).toBe(false) // Should not reach here
      } catch (e: any) {
        expect(e.message).toContain('full')
      }
    })
  })

  describe('DatabaseDriver', () => {
    it('should fallback if SKIP LOCKED fails', async () => {
      const mockDbService = {
        execute: mock((sql: string) => {
          if (sql.includes('SKIP LOCKED')) {
            return Promise.reject(new Error('Syntax error'))
          }
          // Fallback execute (single pop)
          if (sql.trim().startsWith('UPDATE')) {
            return Promise.resolve()
          }
          // pop() query
          return Promise.resolve([
            {
              id: '1',
              payload: JSON.stringify({ id: '1', data: 'foo' }),
              created_at: new Date(),
              attempts: 0,
            },
          ])
        }),
        transaction: mock((cb) => cb(mockDbService)),
      }

      const driver = new DatabaseDriver({ dbService: mockDbService })
      // Use any to bypass private method check or just call public popMany
      const jobs = await driver.popMany('default', 5)

      expect(jobs.length).toBe(1)
      expect(jobs[0].id).toBe('1')
      expect(mockDbService.execute).toHaveBeenCalled()
    })
  })

  describe('RedisDriver', () => {
    it('should use popMany Lua script', async () => {
      const mockClient = {
        defineCommand: () => {},
        popMany: mock((queue, prefix, count, now) => {
          return Promise.resolve([
            JSON.stringify({ id: '1', data: 'foo' }),
            JSON.stringify({ id: '2', data: 'bar' }),
          ])
        }),
        pipeline: () => ({ exec: () => Promise.resolve() }),
        get: () => Promise.resolve(null),
        rpop: () => Promise.resolve(null),
      }

      const driver = new RedisDriver({ client: mockClient as any })
      const jobs = await driver.popMany('default', 5)

      expect(mockClient.popMany).toHaveBeenCalled()
      expect(mockClient.popMany.mock.calls[0][3]).toBeDefined() // Check if 'now' is passed
      expect(jobs.length).toBe(2)
      expect(jobs[0].id).toBe('1')
    })
  })
})
