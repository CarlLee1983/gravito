import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { existsSync, rmSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { SitemapEntry } from '../../src/interfaces'
import { Compactor } from '../../src/storage/Compactor'
import { JsonlLogger } from '../../src/storage/JsonlLogger'

const TEST_DIR = join(import.meta.dir, '.tmp-compactor-test')
const LOG_PATH = join(TEST_DIR, 'ops.jsonl')

describe('Compactor', () => {
  let logger: JsonlLogger
  let compactor: Compactor

  beforeEach(async () => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true })
    }
    await mkdir(TEST_DIR, { recursive: true })

    logger = new JsonlLogger(LOG_PATH)
    compactor = new Compactor(logger)
  })

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true })
    }
  })

  describe('compact()', () => {
    it('should return empty array when no logs exist', async () => {
      const result = await compactor.compact()
      expect(result).toEqual([])
    })

    it('should return initial entries when no logs exist', async () => {
      const initial: SitemapEntry[] = [
        { url: '/page1', priority: 0.8 },
        { url: '/page2', priority: 0.6 },
      ]

      const result = await compactor.compact(initial)

      expect(result.length).toBe(2)
      expect(result.map((e) => e.url)).toContain('/page1')
      expect(result.map((e) => e.url)).toContain('/page2')
    })

    it('should apply add operations correctly', async () => {
      await logger.append({
        op: 'add',
        timestamp: 1000,
        entry: { url: '/new-page', priority: 0.9 },
      })

      const result = await compactor.compact()

      expect(result.length).toBe(1)
      expect(result[0]?.url).toBe('/new-page')
      expect(result[0]?.priority).toBe(0.9)
    })

    it('should apply remove operations correctly', async () => {
      const initial: SitemapEntry[] = [
        { url: '/keep', priority: 0.8 },
        { url: '/remove-me', priority: 0.5 },
      ]

      await logger.append({
        op: 'remove',
        timestamp: 1000,
        url: '/remove-me',
      })

      const result = await compactor.compact(initial)

      expect(result.length).toBe(1)
      expect(result[0]?.url).toBe('/keep')
    })

    it('should deduplicate by URL keeping latest', async () => {
      await logger.append({
        op: 'add',
        timestamp: 1000,
        entry: { url: '/page', priority: 0.5 },
      })
      await logger.append({
        op: 'add',
        timestamp: 2000,
        entry: { url: '/page', priority: 0.9 }, // Updated priority
      })

      const result = await compactor.compact()

      expect(result.length).toBe(1)
      expect(result[0]?.priority).toBe(0.9) // Should be the latest
    })

    it('should sort entries by URL', async () => {
      await logger.append({ op: 'add', timestamp: 1, entry: { url: '/zebra' } })
      await logger.append({ op: 'add', timestamp: 2, entry: { url: '/alpha' } })
      await logger.append({ op: 'add', timestamp: 3, entry: { url: '/middle' } })

      const result = await compactor.compact()

      expect(result.map((e) => e.url)).toEqual(['/alpha', '/middle', '/zebra'])
    })

    it('should handle add then remove for same URL', async () => {
      await logger.append({
        op: 'add',
        timestamp: 1000,
        entry: { url: '/temp-page' },
      })
      await logger.append({
        op: 'remove',
        timestamp: 2000,
        url: '/temp-page',
      })

      const result = await compactor.compact()

      expect(result.length).toBe(0)
    })

    it('should handle remove then re-add for same URL', async () => {
      const initial: SitemapEntry[] = [{ url: '/page', priority: 0.5 }]

      await logger.append({ op: 'remove', timestamp: 1000, url: '/page' })
      await logger.append({
        op: 'add',
        timestamp: 2000,
        entry: { url: '/page', priority: 0.9 },
      })

      const result = await compactor.compact(initial)

      expect(result.length).toBe(1)
      expect(result[0]?.priority).toBe(0.9) // Re-added with new priority
    })

    it('should handle complex sequence of operations', async () => {
      const initial: SitemapEntry[] = [
        { url: '/home', priority: 1.0 },
        { url: '/about', priority: 0.8 },
        { url: '/contact', priority: 0.6 },
      ]

      // Remove /about
      await logger.append({ op: 'remove', timestamp: 1000, url: '/about' })
      // Add /blog
      await logger.append({
        op: 'add',
        timestamp: 2000,
        entry: { url: '/blog', priority: 0.7 },
      })
      // Update /home
      await logger.append({
        op: 'add',
        timestamp: 3000,
        entry: { url: '/home', priority: 0.95 },
      })
      // Add /products
      await logger.append({
        op: 'add',
        timestamp: 4000,
        entry: { url: '/products', priority: 0.8 },
      })

      const result = await compactor.compact(initial)

      expect(result.length).toBe(4)
      expect(result.map((e) => e.url)).toEqual(['/blog', '/contact', '/home', '/products'])

      const home = result.find((e) => e.url === '/home')
      expect(home?.priority).toBe(0.95) // Updated
    })

    it('should handle remove of non-existent URL gracefully', async () => {
      await logger.append({ op: 'remove', timestamp: 1000, url: '/does-not-exist' })

      const result = await compactor.compact()

      expect(result.length).toBe(0) // No crash, just empty
    })
  })
})
