import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import * as coreModule from '@gravito/core'
import { generateStaticSite, type StaticExportConfig } from '../src/export-static'

/** 建立帶 logger 的 mockCore */
const createMockCore = () => ({
  router: {
    compile: mock(() => []),
  },
  logger: {
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    debug: mock(() => {}),
  },
})

/** 建立 mock ArchiveAdapter，直接寫出一個空的 tar.gz 檔案（固定位元組） */
const createMockArchiveAdapter = (_targetPathRef: { path: string }) => ({
  create: mock(async (_entries: Record<string, unknown>, _opts?: unknown) => {
    // 回傳最小合法的 gzip tarball（空檔案，31 bytes）
    return new Uint8Array([
      0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x03, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00,
    ])
  }),
  extract: mock(async () => 0),
  list: mock(async () => new Map()),
  readFile: mock(async () => null),
})

describe('generateStaticSite', () => {
  const outputDir = join(__dirname, 'test-dist-docs')

  beforeEach(() => {
    if (existsSync(outputDir)) {
      rmSync(outputDir, { recursive: true, force: true })
    }
  })

  afterEach(() => {
    if (existsSync(outputDir)) {
      rmSync(outputDir, { recursive: true, force: true })
    }
  })

  it('generates openapi.json and index.html correctly', async () => {
    // Mock the core behavior
    const mockCore = createMockCore() as any

    const config: StaticExportConfig = {
      core: mockCore,
      outputDir,
      astralConfig: {
        title: 'Test Docs',
        version: '1.0.0',
      },
    }

    await generateStaticSite(config)

    // Verify files
    expect(existsSync(join(outputDir, 'openapi.json'))).toBe(true)
    expect(existsSync(join(outputDir, 'index.html'))).toBe(true)

    const htmlContent = readFileSync(join(outputDir, 'index.html'), 'utf-8')
    expect(htmlContent).toContain('<title>Test Docs</title>')
    expect(htmlContent).toContain('unpkg.com/swagger-ui-dist') // default CDN URLs
  })

  it('handles offline asset bundling when configured', async () => {
    const mockCore = createMockCore() as any

    const config: StaticExportConfig = {
      core: mockCore,
      outputDir,
      astralConfig: {
        title: 'Offline Docs',
        version: '1.0.0',
        bundleOfflineAssets: true,
      },
    }

    // Mock fetch to simulate successful download
    const originalFetch = globalThis.fetch
    globalThis.fetch = mock(async () => ({
      ok: true,
      text: async () => 'mock-content',
    })) as any

    await generateStaticSite(config)

    // Restore fetch
    globalThis.fetch = originalFetch

    // Verify offline files were created
    expect(existsSync(join(outputDir, 'swagger-ui.css'))).toBe(true)
    expect(existsSync(join(outputDir, 'swagger-ui-bundle.js'))).toBe(true)
    expect(existsSync(join(outputDir, 'swagger-ui-standalone-preset.js'))).toBe(true)

    const htmlContent = readFileSync(join(outputDir, 'index.html'), 'utf-8')
    expect(htmlContent).toContain('<title>Offline Docs</title>')
    expect(htmlContent).toContain('href="./swagger-ui.css"')
    expect(htmlContent).toContain('src="./swagger-ui-bundle.js"')
  })

  it('generates archive when archive option is true', async () => {
    const mockCore = createMockCore() as any

    // Mock getArchiveAdapter 回傳模擬 adapter
    const mockAdapter = createMockArchiveAdapter({ path: '' })
    const getArchiveAdapterSpy = spyOn(coreModule, 'getArchiveAdapter').mockReturnValue(
      mockAdapter as any
    )

    const config: StaticExportConfig = {
      core: mockCore,
      outputDir,
      astralConfig: {
        title: 'Archive Docs',
        version: '1.0.0',
      },
      archive: true,
    }

    await generateStaticSite(config)

    const archivePath = `${outputDir}.tar.gz`

    // 確認 create 被呼叫（歸檔邏輯執行到位）
    expect(mockAdapter.create).toHaveBeenCalled()

    // 確認歸檔檔案已寫出（由 runtime.writeFile 寫出）
    expect(existsSync(archivePath)).toBe(true)

    // 還原 spy 並清理
    getArchiveAdapterSpy.mockRestore()
    rmSync(archivePath, { force: true })
  })

  it('uses custom archivePath if provided', async () => {
    const mockCore = createMockCore() as any
    const customArchivePath = join(__dirname, 'custom-output.tar.gz')

    // Mock getArchiveAdapter 回傳模擬 adapter
    const mockAdapter = createMockArchiveAdapter({ path: customArchivePath })
    const getArchiveAdapterSpy = spyOn(coreModule, 'getArchiveAdapter').mockReturnValue(
      mockAdapter as any
    )

    const config: StaticExportConfig = {
      core: mockCore,
      outputDir,
      astralConfig: {
        title: 'Custom Archive',
        version: '1.0.0',
      },
      archive: true,
      archivePath: customArchivePath,
    }

    await generateStaticSite(config)

    // 確認 create 被呼叫，且歸檔位於自訂路徑
    expect(mockAdapter.create).toHaveBeenCalled()
    expect(existsSync(customArchivePath)).toBe(true)

    // 還原 spy 並清理
    getArchiveAdapterSpy.mockRestore()
    rmSync(customArchivePath, { force: true })
  })
})
