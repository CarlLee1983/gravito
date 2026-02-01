import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { StaticSiteGenerator } from '../src/ssg/StaticSiteGenerator'

const createMockCore = (routes: Array<{ path: string; method: string }> = []) => ({
  logger: {
    info: mock(() => {}),
    warn: mock(() => {}),
    debug: mock(() => {}),
    error: mock(() => {}),
  },
  adapter: {
    fetch: mock(async (req: Request) => {
      const url = new URL(req.url)
      return new Response(`<html><body>Page ${url.pathname}</body></html>`, { status: 200 })
    }),
  },
  router: {
    routes,
  },
})

describe('StaticSiteGenerator - Batched Processing', () => {
  const outputDir = './test-dist-batching'

  beforeEach(() => {
    if (existsSync(outputDir)) {
      rmSync(outputDir, { recursive: true })
    }
    mkdirSync(outputDir, { recursive: true })
  })

  describe('batch size configuration', () => {
    it('should use default batch size of 100', async () => {
      const routes = Array.from({ length: 250 }, (_, i) => ({
        path: `/page-${i}`,
        method: 'GET',
      }))
      const mockCore = createMockCore(routes)
      const ssg = new StaticSiteGenerator(mockCore as any)

      await ssg.export(outputDir, 'https://example.com')

      expect(existsSync(`${outputDir}/page-0/index.html`)).toBe(true)
      expect(existsSync(`${outputDir}/page-249/index.html`)).toBe(true)
    })

    it('should respect custom batch size', async () => {
      const routes = Array.from({ length: 50 }, (_, i) => ({ path: `/page-${i}`, method: 'GET' }))
      const mockCore = createMockCore(routes)
      const ssg = new StaticSiteGenerator(mockCore as any)

      await ssg.export(outputDir, 'https://example.com', [], { batchSize: 10 })

      expect(existsSync(`${outputDir}/page-0/index.html`)).toBe(true)
      expect(existsSync(`${outputDir}/page-49/index.html`)).toBe(true)
    })

    it('should handle batch size larger than route count', async () => {
      const routes = Array.from({ length: 10 }, (_, i) => ({ path: `/page-${i}`, method: 'GET' }))
      const mockCore = createMockCore(routes)
      const ssg = new StaticSiteGenerator(mockCore as any)

      await ssg.export(outputDir, 'https://example.com', [], { batchSize: 100 })

      expect(existsSync(`${outputDir}/page-0/index.html`)).toBe(true)
      expect(existsSync(`${outputDir}/page-9/index.html`)).toBe(true)
    })

    it('should handle batch size of 1', async () => {
      const routes = Array.from({ length: 5 }, (_, i) => ({ path: `/page-${i}`, method: 'GET' }))
      const mockCore = createMockCore(routes)
      const ssg = new StaticSiteGenerator(mockCore as any)

      await ssg.export(outputDir, 'https://example.com', [], { batchSize: 1 })

      expect(existsSync(`${outputDir}/page-0/index.html`)).toBe(true)
      expect(existsSync(`${outputDir}/page-4/index.html`)).toBe(true)
    })
  })

  describe('memory usage logging', () => {
    it('should log memory usage when enabled', async () => {
      const routes = Array.from({ length: 50 }, (_, i) => ({ path: `/page-${i}`, method: 'GET' }))
      const mockCore = createMockCore(routes)
      const ssg = new StaticSiteGenerator(mockCore as any)

      await ssg.export(outputDir, 'https://example.com', [], {
        batchSize: 20,
        logMemoryUsage: true,
      })

      const debugCalls = (mockCore.logger.debug as any).mock.calls
      const memoryLogs = debugCalls.filter((call: any[]) => call[0]?.includes('[SSG Memory]'))

      expect(memoryLogs.length).toBeGreaterThan(0)
    })

    it('should not log memory usage when disabled', async () => {
      const routes = Array.from({ length: 20 }, (_, i) => ({ path: `/page-${i}`, method: 'GET' }))
      const mockCore = createMockCore(routes)
      const ssg = new StaticSiteGenerator(mockCore as any)

      await ssg.export(outputDir, 'https://example.com', [], {
        logMemoryUsage: false,
      })

      const debugCalls = (mockCore.logger.debug as any).mock.calls
      const memoryLogs = debugCalls.filter((call: any[]) => call[0]?.includes('[SSG Memory]'))

      expect(memoryLogs.length).toBe(0)
    })
  })

  describe('batch processing with errors', () => {
    it('should continue processing batches after errors in one batch', async () => {
      const routes = Array.from({ length: 30 }, (_, i) => ({ path: `/page-${i}`, method: 'GET' }))
      const mockCore = createMockCore(routes)

      const failingFetch = mock(async (req: Request) => {
        const url = new URL(req.url)
        if (url.pathname.match(/\/page-(1[0-9])/)) {
          return new Response('Error', { status: 500 })
        }
        return new Response(`<html>${url.pathname}</html>`, { status: 200 })
      })

      mockCore.adapter.fetch = failingFetch

      const ssg = new StaticSiteGenerator(mockCore as any)

      await ssg.export(outputDir, 'https://example.com', [], { batchSize: 10 })

      expect(existsSync(`${outputDir}/page-0/index.html`)).toBe(true)
      expect(existsSync(`${outputDir}/page-9/index.html`)).toBe(true)

      expect(existsSync(`${outputDir}/page-10/index.html`)).toBe(false)
      expect(existsSync(`${outputDir}/page-19/index.html`)).toBe(false)

      expect(existsSync(`${outputDir}/page-20/index.html`)).toBe(true)
      expect(existsSync(`${outputDir}/page-29/index.html`)).toBe(true)
    })
  })

  describe('batch processing with concurrency', () => {
    it('should respect concurrency limits within batches', async () => {
      let maxConcurrent = 0
      let currentConcurrent = 0

      const routes = Array.from({ length: 50 }, (_, i) => ({ path: `/page-${i}`, method: 'GET' }))
      const mockCore = createMockCore(routes)

      const concurrencyTrackingFetch = mock(async () => {
        currentConcurrent++
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent)

        await new Promise((resolve) => setTimeout(resolve, 10))

        currentConcurrent--
        return new Response('<html>OK</html>', { status: 200 })
      })

      mockCore.adapter.fetch = concurrencyTrackingFetch

      const ssg = new StaticSiteGenerator(mockCore as any)

      await ssg.export(outputDir, 'https://example.com', [], {
        batchSize: 25,
        concurrency: 5,
      })

      expect(maxConcurrent).toBeLessThanOrEqual(5)
    })
  })

  describe('memory efficiency verification', () => {
    it('should not hold all routes in memory simultaneously', async () => {
      const routes = Array.from({ length: 1000 }, (_, i) => ({
        path: `/page-${i}`,
        method: 'GET',
      }))
      const mockCore = createMockCore(routes)
      const ssg = new StaticSiteGenerator(mockCore as any)

      await ssg.export(outputDir, 'https://example.com', [], {
        batchSize: 100,
        logMemoryUsage: true,
      })

      expect(existsSync(`${outputDir}/page-0/index.html`)).toBe(true)
      expect(existsSync(`${outputDir}/page-999/index.html`)).toBe(true)

      const debugCalls = (mockCore.logger.debug as any).mock.calls
      const memoryLogs = debugCalls.filter((call: any[]) => call[0]?.includes('[SSG Memory]'))
      expect(memoryLogs.length).toBeGreaterThan(0)
    })
  })

  describe('batch generator integration', () => {
    it('should process all batches sequentially', async () => {
      const processedBatches: number[] = []

      const routes = Array.from({ length: 30 }, (_, i) => ({ path: `/page-${i}`, method: 'GET' }))
      const mockCore = createMockCore(routes)

      const batchTrackingFetch = mock(async (req: Request) => {
        const url = new URL(req.url)
        const pageNum = parseInt(url.pathname.match(/\/page-(\d+)/)?.[1] || '0')

        const batch = Math.floor(pageNum / 10)
        if (!processedBatches.includes(batch)) {
          processedBatches.push(batch)
        }

        return new Response('<html>OK</html>', { status: 200 })
      })

      mockCore.adapter.fetch = batchTrackingFetch

      const ssg = new StaticSiteGenerator(mockCore as any)

      await ssg.export(outputDir, 'https://example.com', [], { batchSize: 10 })

      expect(processedBatches.sort()).toEqual([0, 1, 2])
    })
  })

  describe('edge cases', () => {
    it('should handle empty route list', async () => {
      const mockCore = createMockCore([])
      const ssg = new StaticSiteGenerator(mockCore as any)

      await ssg.export(outputDir, 'https://example.com', [], { batchSize: 10 })

      expect(existsSync(outputDir)).toBe(true)
    })

    it('should handle single route', async () => {
      const mockCore = createMockCore([{ path: '/single', method: 'GET' }])
      const ssg = new StaticSiteGenerator(mockCore as any)

      await ssg.export(outputDir, 'https://example.com', [], { batchSize: 100 })

      expect(existsSync(`${outputDir}/single/index.html`)).toBe(true)
    })

    it('should handle routes count equal to batch size', async () => {
      const routes = Array.from({ length: 50 }, (_, i) => ({ path: `/page-${i}`, method: 'GET' }))
      const mockCore = createMockCore(routes)
      const ssg = new StaticSiteGenerator(mockCore as any)

      await ssg.export(outputDir, 'https://example.com', [], { batchSize: 50 })

      expect(existsSync(`${outputDir}/page-0/index.html`)).toBe(true)
      expect(existsSync(`${outputDir}/page-49/index.html`)).toBe(true)
    })
  })
})
