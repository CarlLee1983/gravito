import type { StorageOptions } from '../types'

/** localStorage 鍵名前綴 */
const STORAGE_KEY_PREFIX = 'gravito_support_'

/**
 * 儲存項目的資料結構
 */
interface StorageItem<T> {
  /** 實際儲存的值 */
  value: T
  /** 儲存時的時間戳 */
  timestamp: number
  /** 過期時間（毫秒），可選 */
  expiry?: number
}

/**
 * 安全的 localStorage 封裝
 *
 * 提供類型安全、過期機制、錯誤處理的存儲功能
 */
export const secureStorage = {
  /**
   * 讀取儲存的值
   *
   * @template T - 值的類型
   * @param key - 鍵名（會自動加上前綴）
   * @returns 儲存的值，如果不存在或已過期則回傳 null
   *
   * @example
   * ```ts
   * const user = secureStorage.get<User>('user')
   * if (user) {
   *   console.log(user.name)
   * }
   * ```
   */
  get<T>(key: string): T | null {
    try {
      const fullKey = `${STORAGE_KEY_PREFIX}${key}`
      const item = localStorage.getItem(fullKey)

      if (!item) {
        return null
      }

      const parsed = JSON.parse(item) as StorageItem<T>

      // 檢查是否過期
      if (parsed.expiry) {
        const now = Date.now()
        const elapsed = now - parsed.timestamp

        if (elapsed > parsed.expiry) {
          // 過期了，自動刪除
          this.remove(key)
          return null
        }
      }

      return parsed.value
    } catch {
      // 解析失敗或其他錯誤，回傳 null
      return null
    }
  },

  /**
   * 儲存值
   *
   * @template T - 值的類型
   * @param key - 鍵名（會自動加上前綴）
   * @param value - 要儲存的值
   * @param options - 儲存選項
   *
   * @example
   * ```ts
   * // 儲存用戶資料，5 分鐘後過期
   * secureStorage.set('user', userData, { expiry: 5 * 60 * 1000 })
   * ```
   */
  set<T>(key: string, value: T, options?: StorageOptions): void {
    try {
      const fullKey = `${STORAGE_KEY_PREFIX}${key}`
      const item: StorageItem<T> = {
        value,
        timestamp: Date.now(),
      }

      if (options?.expiry) {
        item.expiry = options.expiry
      }

      localStorage.setItem(fullKey, JSON.stringify(item))
    } catch (error) {
      // localStorage 可能不可用（隱私模式、配額超出等）
      // 靜默失敗，不影響應用程式運行
      console.warn('Failed to save to localStorage:', error)
    }
  },

  /**
   * 刪除儲存的值
   *
   * @param key - 鍵名（會自動加上前綴）
   *
   * @example
   * ```ts
   * secureStorage.remove('user')
   * ```
   */
  remove(key: string): void {
    try {
      const fullKey = `${STORAGE_KEY_PREFIX}${key}`
      localStorage.removeItem(fullKey)
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error)
    }
  },

  /**
   * 清除所有 gravito_support_ 前綴的項目
   *
   * @example
   * ```ts
   * secureStorage.clear()
   * ```
   */
  clear(): void {
    try {
      const keysToRemove: string[] = []

      // 收集所有需要刪除的鍵
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(STORAGE_KEY_PREFIX)) {
          keysToRemove.push(key)
        }
      }

      // 刪除收集到的鍵
      keysToRemove.forEach((key) => {
        localStorage.removeItem(key)
      })
    } catch (error) {
      console.warn('Failed to clear localStorage:', error)
    }
  },
}
