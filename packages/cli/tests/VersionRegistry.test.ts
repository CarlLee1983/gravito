import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { VersionRegistry } from '../src/utils/VersionRegistry'

describe('VersionRegistry', () => {
  let registry: VersionRegistry
  let tempDir: string
  let cacheFile: string

  beforeEach(async () => {
    // Create a temporary directory for the test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gravito-test-'))
    cacheFile = path.join(tempDir, '.gravito/versions-cache.json')

    registry = new VersionRegistry()
    // Override the cache file path for testing
    ;(registry as any).cacheFile = cacheFile
  })

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('應該能初始化版本註冊表', async () => {
    await registry.initialize()
    expect(registry.isLoaded()).toBe(true)
  })

  it('應該能獲取 package 版本', async () => {
    await registry.initialize()

    const version = registry.get('@gravito/core')
    expect(version).toBeTruthy()
    expect(version).toMatch(/^\^?\d+\.\d+\.\d+/)
  })

  it('未知 package 應返回 fallback 版本', async () => {
    await registry.initialize()

    const version = registry.get('@unknown/package')
    expect(version).toBe('^1.0.0')
  })

  it('應該能獲取所有版本映射', async () => {
    await registry.initialize()

    const allVersions = registry.getAll()
    expect(Object.keys(allVersions).length).toBeGreaterThan(0)
    expect(allVersions['@gravito/core']).toBeTruthy()
  })

  it('應該能緩存版本資訊', async () => {
    // 第一次初始化
    await registry.initialize()

    // 檢查緩存文件是否存在
    const cacheExists = await fs
      .access(cacheFile)
      .then(() => true)
      .catch(() => false)

    expect(cacheExists).toBe(true)

    // 讀取緩存內容
    const cacheContent = await fs.readFile(cacheFile, 'utf-8')
    const cache = JSON.parse(cacheContent)

    expect(cache.timestamp).toBeTruthy()
    expect(cache.versions).toBeTruthy()
    expect(Object.keys(cache.versions).length).toBeGreaterThan(0)
  })

  it('應該能從緩存讀取版本', async () => {
    // 第一次初始化（創建緩存）
    await registry.initialize()
    const version1 = registry.get('@gravito/core')

    // 創建新的 registry 實例
    const registry2 = new VersionRegistry()
    await registry2.initialize()
    const version2 = registry2.get('@gravito/core')

    // 應該從緩存讀取，版本相同
    expect(version1).toBe(version2)
  })

  it('在 monorepo 開發模式下應優先使用本地版本而非緩存', async () => {
    await fs.mkdir(path.dirname(cacheFile), { recursive: true })
    await fs.writeFile(
      cacheFile,
      JSON.stringify(
        {
          timestamp: Date.now(),
          versions: {
            '@gravito/core': '^0.0.1',
          },
        },
        null,
        2
      )
    )

    ;(registry as any).isMonorepoEnv = () => true
    ;(registry as any).loadFromMonorepo = async function () {
      this.versionMap.set('@gravito/core', '9.9.9-local')
    }

    await registry.initialize()

    expect(registry.get('@gravito/core')).toBe('9.9.9-local')
  })
})
