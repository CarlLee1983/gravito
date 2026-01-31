import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

/**
 * 版本註冊表
 *
 * 負責管理 Gravito packages 的版本映射，支援：
 * - 開發模式：從 monorepo 讀取實際版本
 * - 生產模式：從 npm registry 獲取最新版本
 * - 緩存機制：減少網路請求
 */
export class VersionRegistry {
  /**
   * 緩存過期時間 (1 小時)
   */
  private static readonly CACHE_TTL_MS = 60 * 60 * 1000

  private versionMap: Map<string, string> = new Map()
  private cacheFile = path.join(os.homedir(), '.gravito/versions-cache.json')
  private cacheTTL = VersionRegistry.CACHE_TTL_MS

  /**
   * Gravito 核心 packages 列表
   */
  private static readonly GRAVITO_PACKAGES = [
    '@gravito/core',
    '@gravito/beam',
    '@gravito/photon',
    '@gravito/prism',
    '@gravito/stasis',
    '@gravito/ion',
    '@gravito/atlas',
    '@gravito/constellation',
    '@gravito/spectrum',
    '@gravito/pulse',
  ]

  /**
   * 初始化版本映射
   *
   * 策略:
   * 1. 開發模式: 讀取 monorepo root 的 package.json workspaces
   * 2. 生產模式: 從 npm registry 獲取最新版本
   * 3. 優先使用緩存 (如果未過期)
   */
  async initialize(): Promise<void> {
    // 先嘗試從緩存讀取
    if (await this.loadFromCache()) {
      return
    }

    const isDev = this.isMonorepoEnv()

    if (isDev) {
      await this.loadFromMonorepo()
    } else {
      await this.loadFromRegistry()
    }

    // 保存到緩存
    await this.saveToCache()
  }

  /**
   * 檢查是否在 monorepo 開發環境中
   */
  private isMonorepoEnv(): boolean {
    // 從 CLI package 向上尋找 monorepo root
    let currentDir = path.resolve(__dirname, '../..')

    for (let i = 0; i < 5; i++) {
      const pkgPath = path.join(currentDir, 'package.json')

      if (existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(require('node:fs').readFileSync(pkgPath, 'utf-8'))

          // 檢查是否有 workspaces 定義
          if (pkg.workspaces) {
            return true
          }
        } catch {
          // 忽略解析錯誤
        }
      }

      currentDir = path.dirname(currentDir)
    }

    return false
  }

  /**
   * 從 monorepo 讀取版本
   */
  private async loadFromMonorepo(): Promise<void> {
    // 從 CLI package 向上尋找 monorepo root
    let rootPath = path.resolve(__dirname, '../..')

    for (let i = 0; i < 5; i++) {
      const pkgPath = path.join(rootPath, 'package.json')

      if (existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'))

          if (pkg.workspaces) {
            await this.loadWorkspaces(rootPath, pkg.workspaces)
            return
          }
        } catch {
          // 繼續向上尋找
        }
      }

      rootPath = path.dirname(rootPath)
    }

    // Fallback: 使用預設版本
    this.loadFallbackVersions()
  }

  /**
   * 載入 monorepo workspaces 的版本
   */
  private async loadWorkspaces(
    rootPath: string,
    workspaces: string[] | { packages?: string[] }
  ): Promise<void> {
    const patterns = Array.isArray(workspaces) ? workspaces : workspaces.packages || []

    for (const pattern of patterns) {
      // 簡單處理 glob pattern (只支援 packages/*)
      const dirPath = pattern.replace('/*', '')
      const fullPath = path.join(rootPath, dirPath)

      if (!existsSync(fullPath)) {
        continue
      }

      const entries = await fs.readdir(fullPath)

      for (const entry of entries) {
        const pkgPath = path.join(fullPath, entry, 'package.json')

        if (!existsSync(pkgPath)) {
          continue
        }

        try {
          const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'))

          if (pkg.name?.startsWith('@gravito/')) {
            this.versionMap.set(pkg.name, pkg.version)
          }
        } catch {
          // 忽略無效的 package.json
        }
      }
    }
  }

  /**
   * 從 npm registry 獲取最新版本
   */
  private async loadFromRegistry(): Promise<void> {
    const promises = VersionRegistry.GRAVITO_PACKAGES.map(async (pkg) => {
      try {
        const version = await this.fetchLatestVersion(pkg)
        this.versionMap.set(pkg, `^${version}`)
      } catch {
        console.warn(`無法獲取 ${pkg} 的版本，使用 fallback`)
        this.versionMap.set(pkg, '^1.0.0')
      }
    })

    await Promise.all(promises)
  }

  /**
   * 從 npm registry 獲取指定 package 的最新版本
   */
  private async fetchLatestVersion(packageName: string): Promise<string> {
    const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`, {
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    return data.version
  }

  /**
   * 從緩存讀取版本 (如果未過期)
   */
  private async loadFromCache(): Promise<boolean> {
    try {
      const cacheContent = await fs.readFile(this.cacheFile, 'utf-8')
      const cache = JSON.parse(cacheContent)

      if (Date.now() - cache.timestamp < this.cacheTTL) {
        this.versionMap = new Map(Object.entries(cache.versions))
        return true
      }
    } catch {
      return false
    }

    return false
  }

  /**
   * 保存版本到緩存
   */
  private async saveToCache(): Promise<void> {
    try {
      const cacheDir = path.dirname(this.cacheFile)
      await fs.mkdir(cacheDir, { recursive: true })

      const cache = {
        timestamp: Date.now(),
        versions: Object.fromEntries(this.versionMap),
      }

      await fs.writeFile(this.cacheFile, JSON.stringify(cache, null, 2))
    } catch (err) {
      // 靜默失敗，不影響主流程
      console.warn('無法保存版本緩存:', err)
    }
  }

  /**
   * 載入 fallback 版本 (當其他方法失敗時使用)
   */
  private loadFallbackVersions(): void {
    const fallbackVersions: Record<string, string> = {
      '@gravito/core': '^1.2.1',
      '@gravito/beam': '^1.0.0-alpha.2',
      '@gravito/photon': '^1.0.1',
      '@gravito/prism': '^1.0.1',
      '@gravito/stasis': '^3.0.1',
      '@gravito/ion': '^3.0.1',
      '@gravito/atlas': '^2.1.0',
      '@gravito/constellation': '^1.0.1',
      '@gravito/spectrum': '^1.0.0',
      '@gravito/pulse': '^3.0.1',
    }

    this.versionMap = new Map(Object.entries(fallbackVersions))
  }

  /**
   * 獲取指定 package 的版本
   */
  get(packageName: string): string {
    return this.versionMap.get(packageName) || '^1.0.0'
  }

  /**
   * 獲取所有版本映射
   */
  getAll(): Record<string, string> {
    return Object.fromEntries(this.versionMap)
  }

  /**
   * 檢查是否已載入版本資訊
   */
  isLoaded(): boolean {
    return this.versionMap.size > 0
  }
}
