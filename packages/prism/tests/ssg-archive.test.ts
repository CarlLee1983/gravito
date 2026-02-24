import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import * as coreModule from '@gravito/core'
import { StaticSiteGenerator } from '../src/ssg/StaticSiteGenerator'

/** 建立模擬 PlanetCore，支援簡單路由 */
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

/** 建立模擬 ArchiveAdapter，避免依賴 Bun.Tarball */
const createMockArchiveAdapter = () => ({
  create: mock(async (_entries: Record<string, unknown>, _opts?: unknown) => {
    // 回傳最小合法的 gzip 標頭（模擬壓縮資料）
    return new Uint8Array([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03])
  }),
  extract: mock(async () => 0),
  list: mock(async () => new Map()),
  readFile: mock(async () => null),
})

describe('StaticSiteGenerator - Archive', () => {
  const outputDir = './test-dist-ssg-archive'

  beforeEach(() => {
    if (existsSync(outputDir)) {
      rmSync(outputDir, { recursive: true })
    }
    mkdirSync(outputDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(outputDir)) {
      rmSync(outputDir, { recursive: true })
    }
    const archivePath = `${outputDir}.tar.gz`
    if (existsSync(archivePath)) {
      rmSync(archivePath, { force: true })
    }
  })

  it('generates archive after SSG export', async () => {
    const routes = [{ path: '/page-1', method: 'GET' }]
    const mockCore = createMockCore(routes)
    const ssg = new StaticSiteGenerator(mockCore as any)

    const mockAdapter = createMockArchiveAdapter()
    const spy = spyOn(coreModule, 'getArchiveAdapter').mockReturnValue(mockAdapter as any)

    await ssg.export(outputDir, 'https://example.com', [], { archive: true })

    // 確認 create 被呼叫（archive 邏輯執行）
    expect(mockAdapter.create).toHaveBeenCalled()

    // 確認歸檔檔案已建立
    expect(existsSync(`${outputDir}.tar.gz`)).toBe(true)

    spy.mockRestore()
  })

  it('uses custom compressLevel in archive creation', async () => {
    const routes = [{ path: '/home', method: 'GET' }]
    const mockCore = createMockCore(routes)
    const ssg = new StaticSiteGenerator(mockCore as any)

    const mockAdapter = createMockArchiveAdapter()
    const spy = spyOn(coreModule, 'getArchiveAdapter').mockReturnValue(mockAdapter as any)

    await ssg.export(outputDir, 'https://example.com', [], {
      archive: true,
      compressLevel: 9,
    })

    // 確認 create 傳入 level 選項
    expect(mockAdapter.create).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ compress: 'gzip', level: 9 })
    )

    spy.mockRestore()
  })

  it('skips archive if archive option is false or not set', async () => {
    const routes = [{ path: '/page-1', method: 'GET' }]
    const mockCore = createMockCore(routes)
    const ssg = new StaticSiteGenerator(mockCore as any)

    const mockAdapter = createMockArchiveAdapter()
    const spy = spyOn(coreModule, 'getArchiveAdapter').mockReturnValue(mockAdapter as any)

    // 不傳 archive option
    await ssg.export(outputDir, 'https://example.com', [])

    // archive option 未設定時，create 不應被呼叫
    expect(mockAdapter.create).not.toHaveBeenCalled()
    expect(existsSync(`${outputDir}.tar.gz`)).toBe(false)

    spy.mockRestore()
  })
})
