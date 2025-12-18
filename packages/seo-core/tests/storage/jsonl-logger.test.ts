import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { existsSync, rmSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { JsonlLogger } from '../../src/storage/JsonlLogger'

const TEST_DIR = join(import.meta.dir, '.tmp-jsonl-test')
const LOG_PATH = join(TEST_DIR, 'test.jsonl')

describe('JsonlLogger', () => {
  beforeEach(async () => {
    // Clean up before each test
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true })
    }
    await mkdir(TEST_DIR, { recursive: true })
  })

  afterEach(() => {
    // Clean up after each test
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true })
    }
  })

  describe('append()', () => {
    it('should create log file and append entry', async () => {
      const logger = new JsonlLogger(LOG_PATH)

      await logger.append({
        op: 'add',
        timestamp: 1000,
        entry: { url: '/page1', priority: 0.8 },
      })

      expect(existsSync(LOG_PATH)).toBe(true)

      const content = await readFile(LOG_PATH, 'utf-8')
      const parsed = JSON.parse(content.trim())

      expect(parsed.op).toBe('add')
      expect(parsed.entry.url).toBe('/page1')
    })

    it('should append multiple entries on separate lines', async () => {
      const logger = new JsonlLogger(LOG_PATH)

      await logger.append({ op: 'add', timestamp: 1000, entry: { url: '/a' } })
      await logger.append({ op: 'add', timestamp: 2000, entry: { url: '/b' } })
      await logger.append({ op: 'remove', timestamp: 3000, url: '/a' })

      const content = await readFile(LOG_PATH, 'utf-8')
      const lines = content.trim().split('\n')

      expect(lines.length).toBe(3)
      expect(JSON.parse(lines[0] || '').entry.url).toBe('/a')
      expect(JSON.parse(lines[1] || '').entry.url).toBe('/b')
      expect(JSON.parse(lines[2] || '').op).toBe('remove')
      expect(JSON.parse(lines[2] || '').url).toBe('/a')
    })

    it('should create parent directories if they do not exist', async () => {
      const nestedPath = join(TEST_DIR, 'nested', 'deep', 'log.jsonl')
      const logger = new JsonlLogger(nestedPath)

      await logger.append({ op: 'add', timestamp: 1000, entry: { url: '/test' } })

      expect(existsSync(nestedPath)).toBe(true)
    })
  })

  describe('readAll()', () => {
    it('should return empty array if file does not exist', async () => {
      const logger = new JsonlLogger(LOG_PATH)
      const entries = await logger.readAll()

      expect(entries).toEqual([])
    })

    it('should read all valid entries', async () => {
      const logger = new JsonlLogger(LOG_PATH)

      await logger.append({ op: 'add', timestamp: 1000, entry: { url: '/a' } })
      await logger.append({ op: 'add', timestamp: 2000, entry: { url: '/b' } })

      const entries = await logger.readAll()

      expect(entries.length).toBe(2)
      expect(entries[0]?.entry?.url).toBe('/a')
      expect(entries[1]?.entry?.url).toBe('/b')
    })

    it('should skip corrupted lines gracefully', async () => {
      // Manually write corrupted content
      const content = `{"op":"add","timestamp":1000,"entry":{"url":"/good"}}
invalid json line here
{"op":"add","timestamp":2000,"entry":{"url":"/also-good"}}
`
      await writeFile(LOG_PATH, content)

      const logger = new JsonlLogger(LOG_PATH)
      const entries = await logger.readAll()

      expect(entries.length).toBe(2)
      expect(entries[0]?.entry?.url).toBe('/good')
      expect(entries[1]?.entry?.url).toBe('/also-good')
    })

    it('should handle empty lines', async () => {
      const content = `{"op":"add","timestamp":1000,"entry":{"url":"/a"}}

{"op":"add","timestamp":2000,"entry":{"url":"/b"}}

`
      await writeFile(LOG_PATH, content)

      const logger = new JsonlLogger(LOG_PATH)
      const entries = await logger.readAll()

      expect(entries.length).toBe(2)
    })
  })

  describe('getSize()', () => {
    it('should return 0 for non-existent file', async () => {
      const logger = new JsonlLogger(LOG_PATH)
      const size = await logger.getSize()

      expect(size).toBe(0)
    })

    it('should return correct file size', async () => {
      const logger = new JsonlLogger(LOG_PATH)

      await logger.append({ op: 'add', timestamp: 1000, entry: { url: '/test' } })

      const size = await logger.getSize()
      expect(size).toBeGreaterThan(0)
    })
  })

  describe('delete()', () => {
    it('should delete existing log file', async () => {
      const logger = new JsonlLogger(LOG_PATH)

      await logger.append({ op: 'add', timestamp: 1000, entry: { url: '/test' } })
      expect(existsSync(LOG_PATH)).toBe(true)

      await logger.delete()
      expect(existsSync(LOG_PATH)).toBe(false)
    })

    it('should not throw if file does not exist', async () => {
      const logger = new JsonlLogger(LOG_PATH)

      // Should not throw
      await logger.delete()
      expect(true).toBe(true)
    })
  })
})
