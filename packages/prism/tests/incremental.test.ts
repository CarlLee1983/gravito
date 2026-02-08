import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { IncrementalBuilder } from '../src/ssg/IncrementalBuilder'

const mockCore = {
  logger: {
    info: mock(() => {}),
    warn: mock(() => {}),
    debug: mock(() => {}),
    error: mock(() => {}),
  },
  adapter: {
    fetch: mock(async (req: Request) => {
      const url = new URL(req.url)
      if (url.pathname === '/') {
        return new Response('<html>Home</html>', { status: 200 })
      }
      if (url.pathname === '/about') {
        return new Response('<html>About</html>', { status: 200 })
      }
      if (url.pathname === '/error') {
        return new Response('Not Found', { status: 404 })
      }
      return new Response('<html>Generic</html>', { status: 200 })
    }),
  },
  config: {
    get: mock((_key: string, defaultValue: string) => defaultValue),
  },
}

describe('IncrementalBuilder', () => {
  const outputDir = './test-dist-incremental'
  const manifestPath = `${outputDir}/.build-manifest.json`

  beforeEach(() => {
    if (existsSync(outputDir)) {
      rmSync(outputDir, { recursive: true })
    }
    mkdirSync(outputDir, { recursive: true })
  })

  describe('manifest management', () => {
    it('should create manifest on first build', async () => {
      const builder = new IncrementalBuilder(mockCore as any, outputDir)

      await builder.export([{ path: '/' }], 'https://example.com')

      expect(existsSync(manifestPath)).toBe(true)
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      expect(manifest.version).toBe('1.0')
      expect(manifest.baseUrl).toBe('https://example.com')
      expect(manifest.pages['/']).toBeDefined()
    })

    it('should load existing manifest', async () => {
      const existingManifest = {
        version: '1.0',
        baseUrl: 'https://example.com',
        buildTime: Date.now(),
        pages: {
          '/': {
            path: '/',
            hash: 'abc123',
            sourceHash: 'def456',
            lastBuilt: Date.now(),
            size: 100,
          },
        },
      }
      writeFileSync(manifestPath, JSON.stringify(existingManifest, null, 2))

      const builder = new IncrementalBuilder(mockCore as any, outputDir)
      const stats = builder.getStats()

      expect(stats.totalPages).toBe(1)
      expect(stats.totalSize).toBe(100)
    })

    it('should handle corrupted manifest gracefully', async () => {
      writeFileSync(manifestPath, 'invalid json{{{')

      const builder = new IncrementalBuilder(mockCore as any, outputDir)
      await builder.export([{ path: '/' }], 'https://example.com')

      expect(existsSync(manifestPath)).toBe(true)
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      expect(manifest.pages['/']).toBeDefined()
    })
  })

  describe('incremental builds', () => {
    it('should skip unchanged pages on second build', async () => {
      const builder = new IncrementalBuilder(mockCore as any, outputDir)
      const routes = [{ path: '/' }, { path: '/about' }]

      const firstBuild = await builder.export(routes, 'https://example.com')
      expect(firstBuild.built).toBe(2)
      expect(firstBuild.skipped).toBe(0)

      const secondBuild = await builder.export(routes, 'https://example.com')
      expect(secondBuild.built).toBe(0)
      expect(secondBuild.skipped).toBe(2)
    })

    it('should rebuild when source data changes', async () => {
      const builder = new IncrementalBuilder(mockCore as any, outputDir)

      const route1 = { path: '/', getData: async () => ({ title: 'Home' }) }
      const firstBuild = await builder.export([route1], 'https://example.com')
      expect(firstBuild.built).toBe(1)

      const route2 = { path: '/', getData: async () => ({ title: 'Updated Home' }) }
      const secondBuild = await builder.export([route2], 'https://example.com')
      expect(secondBuild.built).toBe(1)
      expect(secondBuild.skipped).toBe(0)
    })

    it('should rebuild when template changes', async () => {
      const builder = new IncrementalBuilder(mockCore as any, outputDir)

      const route1 = { path: '/', getData: async () => ({ version: 1 }) }
      const firstBuild = await builder.export([route1], 'https://example.com')
      expect(firstBuild.built).toBe(1)

      const route2 = { path: '/', getData: async () => ({ version: 2 }) }
      const secondBuild = await builder.export([route2], 'https://example.com')
      expect(secondBuild.built).toBe(1)
      expect(secondBuild.skipped).toBe(0)
    })

    it('should force rebuild with force=true', async () => {
      const builder = new IncrementalBuilder(mockCore as any, outputDir)
      const routes = [{ path: '/' }, { path: '/about' }]

      await builder.export(routes, 'https://example.com')

      const forceBuild = await builder.export(routes, 'https://example.com', { force: true })
      expect(forceBuild.built).toBe(2)
      expect(forceBuild.skipped).toBe(0)
    })
  })

  describe('build statistics', () => {
    it('should track build statistics', async () => {
      const builder = new IncrementalBuilder(mockCore as any, outputDir)

      await builder.export(
        [{ path: '/' }, { path: '/about' }, { path: '/contact' }],
        'https://example.com'
      )

      const stats = builder.getStats()
      expect(stats.totalPages).toBe(3)
      expect(stats.totalSize).toBeGreaterThan(0)
      expect(stats.lastBuild).toBeGreaterThan(0)
      expect(stats.oldestPage).toBeGreaterThan(0)
      expect(stats.newestPage).toBeGreaterThan(0)
    })
  })

  describe('error handling', () => {
    it('should handle failed requests gracefully', async () => {
      const builder = new IncrementalBuilder(mockCore as any, outputDir)

      const result = await builder.export(
        [{ path: '/' }, { path: '/error' }, { path: '/about' }],
        'https://example.com'
      )

      expect(result.built).toBe(2)
      expect(result.failed).toBe(1)
      expect(result.built + result.failed).toBe(3)
    })

    it('should handle timeout errors', async () => {
      const slowFetch: any = mock(
        async () => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 200))
      )
      mockCore.adapter.fetch = slowFetch

      const builder = new IncrementalBuilder(mockCore as any, outputDir)

      const result = await builder.export([{ path: '/' }], 'https://example.com', {
        timeout: 100,
      })

      expect(result.failed).toBe(1)
    })
  })

  describe('concurrency control', () => {
    it('should handle concurrent builds safely', async () => {
      mockCore.adapter.fetch = mock(async (req: Request) => {
        const url = new URL(req.url)
        return new Response(`<html>Page ${url.pathname}</html>`, { status: 200 })
      })

      const builder = new IncrementalBuilder(mockCore as any, outputDir)

      const routes = Array.from({ length: 20 }, (_, i) => ({ path: `/page-${i}` }))

      const result = await builder.export(routes, 'https://example.com', {
        concurrency: 5,
      })

      expect(result.built).toBe(20)
      expect(result.failed).toBe(0)
    })
  })
})
