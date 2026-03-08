import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { VersionChecker } from '../src/utils/VersionChecker'

describe('VersionChecker', () => {
  let checker: VersionChecker
  let tempDir: string
  let cacheFile: string

  beforeEach(async () => {
    // Create a temporary directory for the test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gravito-test-'))
    cacheFile = path.join(tempDir, '.gravito/version-check-cache.json')

    checker = new VersionChecker()
    // Override the cache file path for testing
    ;(checker as any).cacheFile = cacheFile
  })

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true })

    // 清理環境變數
    delete process.env.GRAVITO_SKIP_VERSION_CHECK
  })

  it('應該能檢查版本', async () => {
    const result = await checker.check()

    expect(result).toBeTruthy()
    expect(result.currentVersion).toBeTruthy()
    expect(result.latestVersion).toBeTruthy()
    expect(typeof result.isLatest).toBe('boolean')
    expect(typeof result.shouldWarn).toBe('boolean')
  })

  it('應該能緩存檢查結果', async () => {
    // 第一次檢查
    await checker.check()

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
    expect(cache.result).toBeTruthy()
    expect(cache.result.currentVersion).toBeTruthy()
  })

  it('應該能從緩存讀取結果', async () => {
    // 第一次檢查（創建緩存）
    const result1 = await checker.check()

    // 創建新的 checker 實例
    const checker2 = new VersionChecker()
    const result2 = await checker2.check()

    // 應該從緩存讀取，結果相同
    expect(result1.currentVersion).toBe(result2.currentVersion)
    expect(result1.latestVersion).toBe(result2.latestVersion)
  })

  it('環境變數 GRAVITO_SKIP_VERSION_CHECK=1 應該跳過檢查', async () => {
    process.env.GRAVITO_SKIP_VERSION_CHECK = '1'

    const result = await checker.check()

    expect(result.isLatest).toBe(true)
    expect(result.shouldWarn).toBe(false)
  })

  it('checkSilent 應該返回 boolean', async () => {
    const isLatest = await checker.checkSilent()
    expect(typeof isLatest).toBe('boolean')
  })

  it('showUpgradeMessage 在已是最新版本時不應輸出', () => {
    const result = {
      isLatest: true,
      currentVersion: '1.0.0',
      latestVersion: '1.0.0',
      shouldWarn: false,
    }

    // 這個不應該拋出錯誤
    expect(() => checker.showUpgradeMessage(result)).not.toThrow()
  })
})
