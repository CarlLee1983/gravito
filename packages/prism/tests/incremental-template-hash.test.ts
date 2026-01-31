import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
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
      return new Response('<html>Generic</html>', { status: 200 })
    }),
  },
  config: {
    get: mock((key: string, defaultValue: string) => {
      if (key === 'VIEW_DIR') {
        return './test-views'
      }
      return defaultValue
    }),
  },
}

describe('IncrementalBuilder - Template Hash Tracking', () => {
  const outputDir = './test-dist-template-hash'
  const viewsDir = './test-views'
  const manifestPath = `${outputDir}/.build-manifest.json`

  beforeEach(() => {
    if (existsSync(outputDir)) {
      rmSync(outputDir, { recursive: true })
    }
    if (existsSync(viewsDir)) {
      rmSync(viewsDir, { recursive: true })
    }
    mkdirSync(outputDir, { recursive: true })
    mkdirSync(viewsDir, { recursive: true })
  })

  describe('template hash computation', () => {
    it('should compute template hash when tracking is enabled', async () => {
      const homeTemplate = join(viewsDir, 'home.html')
      writeFileSync(homeTemplate, '<h1>Home Template</h1>', 'utf-8')

      const builder = new IncrementalBuilder(mockCore as any, outputDir, {
        trackTemplateDependencies: true,
        viewsDir,
      })

      await builder.export([{ path: '/' }], 'https://example.com')

      expect(existsSync(manifestPath)).toBe(true)
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      expect(manifest.pages['/'].templateHash).toBeDefined()
      expect(typeof manifest.pages['/'].templateHash).toBe('string')
    })

    it('should not compute template hash when tracking is disabled', async () => {
      const homeTemplate = join(viewsDir, 'home.html')
      writeFileSync(homeTemplate, '<h1>Home Template</h1>', 'utf-8')

      const builder = new IncrementalBuilder(mockCore as any, outputDir, {
        trackTemplateDependencies: false,
        viewsDir,
      })

      await builder.export([{ path: '/' }], 'https://example.com')

      expect(existsSync(manifestPath)).toBe(true)
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      expect(manifest.pages['/'].templateHash).toBeUndefined()
    })

    it('should handle missing template files gracefully', async () => {
      const builder = new IncrementalBuilder(mockCore as any, outputDir, {
        trackTemplateDependencies: true,
        viewsDir,
      })

      await builder.export([{ path: '/missing' }], 'https://example.com')

      expect(existsSync(manifestPath)).toBe(true)
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      expect(manifest.pages['/missing']).toBeDefined()
    })
  })

  describe('template change detection', () => {
    it('should rebuild when template content changes', async () => {
      const homeTemplate = join(viewsDir, 'home.html')
      writeFileSync(homeTemplate, '<h1>Original Home</h1>', 'utf-8')

      const builder = new IncrementalBuilder(mockCore as any, outputDir, {
        trackTemplateDependencies: true,
        viewsDir,
      })

      const firstBuild = await builder.export([{ path: '/' }], 'https://example.com')
      expect(firstBuild.built).toBe(1)
      expect(firstBuild.skipped).toBe(0)

      await new Promise((resolve) => setTimeout(resolve, 10))

      writeFileSync(homeTemplate, '<h1>Updated Home</h1>', 'utf-8')

      const secondBuild = await builder.export([{ path: '/' }], 'https://example.com')
      expect(secondBuild.built).toBe(1)
      expect(secondBuild.skipped).toBe(0)
    })

    it('should skip rebuild when template unchanged', async () => {
      const homeTemplate = join(viewsDir, 'home.html')
      writeFileSync(homeTemplate, '<h1>Home Template</h1>', 'utf-8')

      const builder = new IncrementalBuilder(mockCore as any, outputDir, {
        trackTemplateDependencies: true,
        viewsDir,
      })

      const firstBuild = await builder.export([{ path: '/' }], 'https://example.com')
      expect(firstBuild.built).toBe(1)

      const secondBuild = await builder.export([{ path: '/' }], 'https://example.com')
      expect(secondBuild.built).toBe(0)
      expect(secondBuild.skipped).toBe(1)
    })

    it('should rebuild when data changes even if template unchanged', async () => {
      const homeTemplate = join(viewsDir, 'home.html')
      writeFileSync(homeTemplate, '<h1>Home Template</h1>', 'utf-8')

      const builder = new IncrementalBuilder(mockCore as any, outputDir, {
        trackTemplateDependencies: true,
        viewsDir,
      })

      const route1 = { path: '/', getData: async () => ({ version: 1 }) }
      const firstBuild = await builder.export([route1], 'https://example.com')
      expect(firstBuild.built).toBe(1)

      const route2 = { path: '/', getData: async () => ({ version: 2 }) }
      const secondBuild = await builder.export([route2], 'https://example.com')
      expect(secondBuild.built).toBe(1)
      expect(secondBuild.skipped).toBe(0)
    })
  })

  describe('template hash caching', () => {
    it('should cache template hashes by mtime', async () => {
      const homeTemplate = join(viewsDir, 'home.html')
      writeFileSync(homeTemplate, '<h1>Home Template</h1>', 'utf-8')

      const builder = new IncrementalBuilder(mockCore as any, outputDir, {
        trackTemplateDependencies: true,
        viewsDir,
      })

      await builder.export([{ path: '/' }], 'https://example.com')

      const manifest1 = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      const hash1 = manifest1.pages['/'].templateHash

      await builder.export([{ path: '/' }], 'https://example.com')

      const manifest2 = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      const hash2 = manifest2.pages['/'].templateHash

      expect(hash1).toBe(hash2)
    })

    it('should invalidate cache when file mtime changes', async () => {
      const homeTemplate = join(viewsDir, 'home.html')
      writeFileSync(homeTemplate, '<h1>Home Template</h1>', 'utf-8')

      const builder = new IncrementalBuilder(mockCore as any, outputDir, {
        trackTemplateDependencies: true,
        viewsDir,
      })

      await builder.export([{ path: '/' }], 'https://example.com')

      const manifest1 = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      const hash1 = manifest1.pages['/'].templateHash

      await new Promise((resolve) => setTimeout(resolve, 10))

      writeFileSync(homeTemplate, '<h1>Home Template Modified</h1>', 'utf-8')

      await builder.export([{ path: '/' }], 'https://example.com')

      const manifest2 = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      const hash2 = manifest2.pages['/'].templateHash

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('template path extraction', () => {
    it('should map root path to home template', async () => {
      const homeTemplate = join(viewsDir, 'home.html')
      writeFileSync(homeTemplate, '<h1>Home</h1>', 'utf-8')

      const builder = new IncrementalBuilder(mockCore as any, outputDir, {
        trackTemplateDependencies: true,
        viewsDir,
      })

      await builder.export([{ path: '/' }], 'https://example.com')

      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      expect(manifest.pages['/'].templateHash).toBeDefined()
    })

    it('should map nested paths to dotted template names', async () => {
      const aboutTemplate = join(viewsDir, 'about.html')
      writeFileSync(aboutTemplate, '<h1>About</h1>', 'utf-8')

      const builder = new IncrementalBuilder(mockCore as any, outputDir, {
        trackTemplateDependencies: true,
        viewsDir,
      })

      await builder.export([{ path: '/about' }], 'https://example.com')

      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      expect(manifest.pages['/about']).toBeDefined()
    })
  })

  describe('dual hash verification', () => {
    it('should track both data and template hashes', async () => {
      const homeTemplate = join(viewsDir, 'home.html')
      writeFileSync(homeTemplate, '<h1>Home Template</h1>', 'utf-8')

      const builder = new IncrementalBuilder(mockCore as any, outputDir, {
        trackTemplateDependencies: true,
        viewsDir,
      })

      const route = { path: '/', getData: async () => ({ content: 'test' }) }
      await builder.export([route], 'https://example.com')

      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      const page = manifest.pages['/']

      expect(page.sourceHash).toBeDefined()
      expect(page.templateHash).toBeDefined()
      expect(page.sourceHash).not.toBe(page.templateHash)
    })

    it('should rebuild if either hash changes', async () => {
      const homeTemplate = join(viewsDir, 'home.html')
      writeFileSync(homeTemplate, '<h1>Home</h1>', 'utf-8')

      const builder = new IncrementalBuilder(mockCore as any, outputDir, {
        trackTemplateDependencies: true,
        viewsDir,
      })

      const route1 = { path: '/', getData: async () => ({ v: 1 }) }
      await builder.export([route1], 'https://example.com')

      await new Promise((resolve) => setTimeout(resolve, 10))
      writeFileSync(homeTemplate, '<h1>Updated Home</h1>', 'utf-8')

      const route2 = { path: '/', getData: async () => ({ v: 2 }) }
      const result = await builder.export([route2], 'https://example.com')

      expect(result.built).toBe(1)
    })
  })

  describe('manifest persistence', () => {
    it('should persist template hashes across builder instances', async () => {
      const homeTemplate = join(viewsDir, 'home.html')
      writeFileSync(homeTemplate, '<h1>Home</h1>', 'utf-8')

      const builder1 = new IncrementalBuilder(mockCore as any, outputDir, {
        trackTemplateDependencies: true,
        viewsDir,
      })

      await builder1.export([{ path: '/' }], 'https://example.com')

      const manifest1 = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      const hash1 = manifest1.pages['/'].templateHash

      const builder2 = new IncrementalBuilder(mockCore as any, outputDir, {
        trackTemplateDependencies: true,
        viewsDir,
      })

      const result = await builder2.export([{ path: '/' }], 'https://example.com')

      expect(result.skipped).toBe(1)

      const manifest2 = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      const hash2 = manifest2.pages['/'].templateHash

      expect(hash1).toBe(hash2)
    })
  })

  describe('edge cases', () => {
    it('should handle routes with query parameters', async () => {
      const builder = new IncrementalBuilder(mockCore as any, outputDir, {
        trackTemplateDependencies: true,
        viewsDir,
      })

      await builder.export([{ path: '/search?q=test' }], 'https://example.com')

      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      expect(manifest.pages['/search?q=test']).toBeDefined()
    })

    it('should handle concurrent builds safely', async () => {
      const homeTemplate = join(viewsDir, 'home.html')
      writeFileSync(homeTemplate, '<h1>Home</h1>', 'utf-8')

      const builder = new IncrementalBuilder(mockCore as any, outputDir, {
        trackTemplateDependencies: true,
        viewsDir,
      })

      const routes = Array.from({ length: 10 }, (_, i) => ({ path: `/page-${i}` }))

      const result = await builder.export(routes, 'https://example.com', { concurrency: 5 })

      expect(result.built + result.failed).toBe(10)
      expect(existsSync(manifestPath)).toBe(true)
    })

    it('should work without trackTemplateDependencies option', async () => {
      const builder = new IncrementalBuilder(mockCore as any, outputDir)

      await builder.export([{ path: '/' }], 'https://example.com')

      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      expect(manifest.pages['/'].templateHash).toBeUndefined()
    })
  })
})
