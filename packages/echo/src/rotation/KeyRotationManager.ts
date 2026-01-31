/**
 * Key Rotation Manager
 *
 * 管理 Webhook Provider 的密鑰輪換，支援多版本密鑰、自動清理和 Grace Period。
 *
 * @module @gravito/echo/rotation
 * @since v1.2
 */

import type { KeyRotationConfig, ProviderKeyEntry } from '../types'

/**
 * 預設配置
 */
const DEFAULT_CONFIG: Required<KeyRotationConfig> = {
  enabled: false,
  autoCleanup: true,
  gracePeriod: 24 * 60 * 60 * 1000, // 24 hours
  keyProvider: async () => [],
  onRotate: () => {},
}

/**
 * Key Rotation Manager
 *
 * 集中管理所有 Provider 的密鑰輪換，支援：
 * - 多版本密鑰管理
 * - 自動過期清理
 * - Grace Period 機制
 * - 主密鑰輪換
 *
 * @example
 * ```typescript
 * const manager = new KeyRotationManager({
 *   gracePeriod: 24 * 60 * 60 * 1000, // 24 hours
 *   autoCleanup: true,
 * })
 *
 * // 註冊多個密鑰
 * manager.registerKeys('stripe', [
 *   {
 *     key: 'whsec_new',
 *     version: 'v2',
 *     isPrimary: true,
 *     activeFrom: new Date(),
 *   },
 *   {
 *     key: 'whsec_old',
 *     version: 'v1',
 *     isPrimary: false,
 *     activeFrom: new Date('2025-01-01'),
 *     expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
 *   },
 * ])
 *
 * // 獲取活動密鑰用於驗證
 * const keys = manager.getActiveKeys('stripe')
 *
 * // 輪換主密鑰
 * await manager.rotatePrimaryKey('stripe', {
 *   key: 'whsec_newest',
 *   version: 'v3',
 *   activeFrom: new Date(),
 * })
 * ```
 *
 * @public
 */
export class KeyRotationManager {
  private providerKeys = new Map<string, ProviderKeyEntry[]>()
  private cleanupTimer?: Timer
  private config: Required<KeyRotationConfig>

  constructor(config: KeyRotationConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    if (this.config.enabled && this.config.autoCleanup) {
      this.startAutoCleanup()
    }
  }

  /**
   * 註冊 Provider 的密鑰
   *
   * @param providerName - Provider 名稱
   * @param keys - 密鑰陣列
   * @throws Error 如果沒有主密鑰或有多個主密鑰
   */
  registerKeys(providerName: string, keys: ProviderKeyEntry[]): void {
    // 驗證密鑰
    const primaryKeys = keys.filter((k) => k.isPrimary)
    if (primaryKeys.length !== 1) {
      throw new Error(`Provider ${providerName} must have exactly one primary key`)
    }

    // 按 activeFrom 降序排序
    const sorted = [...keys].sort((a, b) => b.activeFrom.getTime() - a.activeFrom.getTime())

    this.providerKeys.set(providerName, sorted)
  }

  /**
   * 獲取所有活動密鑰用於驗證
   *
   * 返回當前有效的密鑰（activeFrom <= now < expiresAt）。
   *
   * @param providerName - Provider 名稱
   * @returns 活動密鑰陣列
   */
  getActiveKeys(providerName: string): ProviderKeyEntry[] {
    const keys = this.providerKeys.get(providerName) ?? []
    const now = new Date()

    return keys.filter((key) => {
      const isActive = key.activeFrom <= now
      const notExpired = !key.expiresAt || key.expiresAt > now
      return isActive && notExpired
    })
  }

  /**
   * 獲取主密鑰用於簽章
   *
   * @param providerName - Provider 名稱
   * @returns 主密鑰或 null
   */
  getPrimaryKey(providerName: string): ProviderKeyEntry | null {
    const keys = this.getActiveKeys(providerName)
    return keys.find((k) => k.isPrimary) ?? null
  }

  /**
   * 輪換為新的主密鑰
   *
   * 舊的主密鑰會自動設定過期時間（使用 Grace Period），
   * 新密鑰會成為主密鑰。
   *
   * @param providerName - Provider 名稱
   * @param newKey - 新密鑰（不含 isPrimary 屬性）
   */
  async rotatePrimaryKey(
    providerName: string,
    newKey: Omit<ProviderKeyEntry, 'isPrimary'>
  ): Promise<void> {
    const existingKeys = this.providerKeys.get(providerName) ?? []

    // 標記舊的主密鑰為非主密鑰並設定過期時間
    const updatedKeys = existingKeys.map((key) => ({
      ...key,
      isPrimary: false,
      expiresAt: key.isPrimary ? new Date(Date.now() + this.config.gracePeriod) : key.expiresAt,
    }))

    // 加入新的主密鑰
    const primaryKey: ProviderKeyEntry = {
      ...newKey,
      isPrimary: true,
    }

    updatedKeys.unshift(primaryKey)
    this.providerKeys.set(providerName, updatedKeys)

    this.config.onRotate(providerName, primaryKey)
  }

  /**
   * 清理過期密鑰
   *
   * @returns 清理的密鑰數量
   */
  cleanupExpiredKeys(): number {
    const now = new Date()
    let cleaned = 0

    for (const [providerName, keys] of this.providerKeys.entries()) {
      const active = keys.filter((key) => !key.expiresAt || key.expiresAt > now)

      if (active.length !== keys.length) {
        cleaned += keys.length - active.length
        this.providerKeys.set(providerName, active)
      }
    }

    return cleaned
  }

  /**
   * 啟動自動清理定時器
   */
  private startAutoCleanup(): void {
    // 每小時執行一次清理
    this.cleanupTimer = setInterval(
      () => {
        const cleaned = this.cleanupExpiredKeys()
        if (cleaned > 0) {
          console.log(`[KeyRotationManager] Cleaned up ${cleaned} expired keys`)
        }
      },
      60 * 60 * 1000
    )
  }

  /**
   * 停止自動清理
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
  }

  /**
   * 獲取所有 Provider 的密鑰狀態
   *
   * @returns Provider 名稱到密鑰陣列的對應
   */
  getAllProviderKeys(): Map<string, ProviderKeyEntry[]> {
    return new Map(this.providerKeys)
  }

  /**
   * 檢查 Provider 是否有註冊密鑰
   *
   * @param providerName - Provider 名稱
   * @returns 是否有註冊密鑰
   */
  hasProvider(providerName: string): boolean {
    return this.providerKeys.has(providerName)
  }
}
