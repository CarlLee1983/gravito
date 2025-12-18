/**
 * 設定管理器 (ConfigManager)
 * 統一管理環境變數與應用程式設定
 */
export class ConfigManager {
  private config: Map<string, unknown> = new Map()

  constructor(initialConfig: Record<string, unknown> = {}) {
    // 1. 載入傳入的初始設定
    for (const [key, value] of Object.entries(initialConfig)) {
      this.config.set(key, value)
    }

    // 2. 自動載入 Bun 的環境變數
    this.loadEnv()
  }

  /**
   * 從 Bun.env 載入所有環境變數
   */
  private loadEnv() {
    const env = Bun.env
    for (const key of Object.keys(env)) {
      if (env[key] !== undefined) {
        this.config.set(key, env[key])
      }
    }
  }

  /**
   * 取得設定值
   * 支援泛型回傳
   */
  // biome-ignore lint/suspicious/noExplicitAny: convenient for users
  get<T = any>(key: string, defaultValue?: T): T {
    if (this.config.has(key)) {
      return this.config.get(key) as T
    }
    if (defaultValue !== undefined) {
      return defaultValue
    }
    throw new Error(`Config key '${key}' not found`)
  }

  /**
   * 設定值
   */
  set(key: string, value: unknown): void {
    this.config.set(key, value)
  }

  /**
   * 檢查是否存在
   */
  has(key: string): boolean {
    return this.config.has(key)
  }
}
