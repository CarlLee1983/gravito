import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import pc from 'picocolors'

interface VersionCheckResult {
  isLatest: boolean
  currentVersion: string
  latestVersion: string
  shouldWarn: boolean // major 版本不同時為 true
}

interface VersionParts {
  major: number
  minor: number
  patch: number
}

/**
 * CLI 版本檢查器
 *
 * 負責檢查 CLI 是否為最新版本，並提示用戶升級
 * - 支援緩存機制 (24 小時檢查一次)
 * - 區分 major/minor 版本差異
 * - 提供友善的升級提示
 */
export class VersionChecker {
  /**
   * 緩存過期時間 (24 小時)
   */
  private static readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000

  private currentVersion: string
  private cacheFile = path.join(os.homedir(), '.gravito/version-check-cache.json')
  private cacheTTL = VersionChecker.CACHE_TTL_MS

  constructor() {
    // 從 package.json 讀取當前版本
    this.currentVersion = this.getCurrentVersion()
  }

  /**
   * 讀取當前 CLI 版本
   */
  private getCurrentVersion(): string {
    try {
      // 嘗試多個可能的 package.json 位置
      const possiblePaths = [
        // 開發模式
        path.resolve(__dirname, '../../package.json'),
        // 生產模式 (全域安裝)
        path.resolve(__dirname, '../package.json'),
      ]

      for (const pkgPath of possiblePaths) {
        try {
          const pkg = JSON.parse(require('node:fs').readFileSync(pkgPath, 'utf-8'))

          if (pkg.name === '@gravito/pulse' && pkg.version) {
            return pkg.version
          }
        } catch {}
      }

      return '0.0.0' // Fallback
    } catch {
      return '0.0.0'
    }
  }

  /**
   * 檢查是否有新版本
   */
  async check(): Promise<VersionCheckResult> {
    // 環境變數控制：跳過版本檢查
    if (process.env.GRAVITO_SKIP_VERSION_CHECK === '1') {
      return this.createResult(true, this.currentVersion)
    }

    // 檢查緩存
    const cachedResult = await this.loadFromCache()
    if (cachedResult) {
      return cachedResult
    }

    // 執行實際檢查
    const result = await this.performCheck()

    // 保存到緩存
    await this.saveToCache(result)

    return result
  }

  /**
   * 執行實際的版本檢查
   */
  private async performCheck(): Promise<VersionCheckResult> {
    try {
      const response = await fetch('https://registry.npmjs.org/@gravito/pulse/latest', {
        headers: {
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      const latestVersion = data.version

      return this.createResult(false, latestVersion)
    } catch {
      // 網路錯誤或 registry 無法訪問，靜默失敗
      return this.createResult(true, this.currentVersion)
    }
  }

  /**
   * 創建版本檢查結果
   */
  private createResult(assumeLatest: boolean, latestVersion: string): VersionCheckResult {
    if (assumeLatest) {
      return {
        isLatest: true,
        currentVersion: this.currentVersion,
        latestVersion: this.currentVersion,
        shouldWarn: false,
      }
    }

    const current = this.parseVersion(this.currentVersion)
    const latest = this.parseVersion(latestVersion)

    return {
      isLatest: this.currentVersion === latestVersion,
      currentVersion: this.currentVersion,
      latestVersion,
      shouldWarn: current.major < latest.major, // Breaking changes
    }
  }

  /**
   * 解析語義化版本
   */
  private parseVersion(version: string): VersionParts {
    // 移除 'v' 前綴 (如果有)
    const cleanVersion = version.replace(/^v/, '')

    // 移除 pre-release 標籤 (如 -alpha.2)
    const [baseVersion] = cleanVersion.split('-')

    const parts = baseVersion.split('.').map(Number)

    return {
      major: parts[0] || 0,
      minor: parts[1] || 0,
      patch: parts[2] || 0,
    }
  }

  /**
   * 從緩存讀取結果
   */
  private async loadFromCache(): Promise<VersionCheckResult | null> {
    try {
      const cacheContent = await fs.readFile(this.cacheFile, 'utf-8')
      const cache = JSON.parse(cacheContent)

      if (Date.now() - cache.timestamp < this.cacheTTL) {
        return cache.result
      }
    } catch {
      return null
    }

    return null
  }

  /**
   * 保存結果到緩存
   */
  private async saveToCache(result: VersionCheckResult): Promise<void> {
    try {
      const cacheDir = path.dirname(this.cacheFile)
      await fs.mkdir(cacheDir, { recursive: true })

      const cache = {
        timestamp: Date.now(),
        result,
      }

      await fs.writeFile(this.cacheFile, JSON.stringify(cache, null, 2))
    } catch {
      // 靜默失敗
    }
  }

  /**
   * 顯示升級提示
   */
  showUpgradeMessage(result: VersionCheckResult): void {
    // 已是最新版本，不顯示任何訊息
    if (result.isLatest) return

    console.log('') // 空行

    if (result.shouldWarn) {
      // Major 版本差異 - 警告訊息
      console.log(
        pc.yellow(`⚠️  CLI 版本過舊 (${result.currentVersion})，最新版本為 ${result.latestVersion}`)
      )
      console.log(pc.yellow(`   執行 ${pc.bold('bun install -g @gravito/pulse@latest')} 升級`))
    } else {
      // Minor/Patch 版本差異 - 資訊訊息
      console.log(
        pc.gray(`ℹ️  有新版本可用: ${result.latestVersion} (當前: ${result.currentVersion})`)
      )
      console.log(pc.gray(`   執行 ${pc.bold('bun install -g @gravito/pulse@latest')} 升級`))
    }

    console.log('') // 空行
  }

  /**
   * 靜默檢查 (不顯示任何輸出)
   */
  async checkSilent(): Promise<boolean> {
    const result = await this.check()
    return result.isLatest
  }
}
