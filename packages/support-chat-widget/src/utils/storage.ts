import type { StorageOptions } from '../types'

/** Prefix for all keys stored in localStorage by this module */
const STORAGE_KEY_PREFIX = 'gravito_support_'

/**
 * Internal structure for stored items, including metadata for expiration.
 *
 * @template T - The type of the value being stored.
 */
interface StorageItem<T> {
  /** The actual data value */
  value: T
  /** Timestamp of when the item was created/updated */
  timestamp: number
  /** Optional duration in milliseconds until the item expires */
  expiry?: number
}

/**
 * A secure and typed wrapper around localStorage.
 *
 * Provides type-safe access, automatic key prefixing, and an expiration mechanism.
 * Errors are caught and handled gracefully (e.g., in private browsing modes).
 */
export const secureStorage = {
  /**
   * Retrieves a value from storage by its key.
   *
   * Automatically handles key prefixing and checks for expiration.
   * If the item is expired, it is removed and null is returned.
   *
   * @template T - Expected type of the stored value.
   * @param key - The base key name (prefix will be added).
   * @returns The stored value, or null if not found, expired, or invalid.
   *
   * @example
   * ```ts
   * const user = secureStorage.get<User>('user');
   * if (user) {
   *   console.log(`Found user: ${user.name}`);
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

      // Check for expiration
      if (parsed.expiry) {
        const now = Date.now()
        const elapsed = now - parsed.timestamp

        if (elapsed > parsed.expiry) {
          // Auto-remove expired item
          this.remove(key)
          return null
        }
      }

      return parsed.value
    } catch {
      // Return null for parsing failures or storage errors
      return null
    }
  },

  /**
   * Stores a value in localStorage with optional expiration.
   *
   * @template T - Type of the value being stored.
   * @param key - The base key name.
   * @param value - The value to store.
   * @param options - Additional options like expiry time.
   *
   * @example
   * ```ts
   * // Store session data that expires in 1 hour
   * secureStorage.set('session', data, { expiry: 60 * 60 * 1000 });
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
      // Quietly fail for storage quota exceeded or private mode
      console.warn('Failed to save to localStorage:', error)
    }
  },

  /**
   * Removes an item from storage.
   *
   * @param key - The base key name to remove.
   *
   * @example
   * ```ts
   * secureStorage.remove('user_session');
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
   * Clears all items from localStorage that match the module's prefix.
   *
   * @example
   * ```ts
   * secureStorage.clear();
   * ```
   */
  clear(): void {
    try {
      const keysToRemove: string[] = []

      // Identify all keys with the specific prefix
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(STORAGE_KEY_PREFIX)) {
          keysToRemove.push(key)
        }
      }

      // Remove identified keys
      for (const key of keysToRemove) {
        localStorage.removeItem(key)
      }
    } catch (error) {
      console.warn('Failed to clear localStorage:', error)
    }
  },
}
