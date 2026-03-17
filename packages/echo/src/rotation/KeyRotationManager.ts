/**
 * @fileoverview Key Rotation Manager
 *
 * Manages the lifecycle of webhook provider secrets, including multi-version
 * support, automatic cleanup, and grace periods for smooth transitions.
 *
 * @module @gravito/echo/rotation
 * @since v1.2
 */

import type { KeyRotationConfig, ProviderKeyEntry } from '../types'

/**
 * Default internal configuration for key rotation.
 */
const DEFAULT_CONFIG: Required<KeyRotationConfig> = {
  enabled: false,
  autoCleanup: true,
  gracePeriod: 24 * 60 * 60 * 1000, // 24 hours
  keyProvider: async () => [],
  onRotate: () => {
    /* Noop by default */
  },
}

/**
 * KeyRotationManager orchestrates the lifecycle of webhook provider secrets.
 *
 * It provides a central hub for managing multiple concurrent versions of signing
 * secrets, enabling zero-downtime rotation. By maintaining a set of "active"
 * keys (including those in a grace period), it ensures that webhooks signed
 * with either an old or new secret are successfully verified during transition.
 *
 * Key features:
 * - Multi-version secret management.
 * - Automatic background cleanup of expired keys.
 * - Grace period support for smooth cut-overs.
 * - Promotion of new primary keys.
 *
 * @example Managing zero-downtime rotation
 * ```typescript
 * const manager = new KeyRotationManager({
 *   gracePeriod: 86400000, // 24 hours
 *   autoCleanup: true,
 * });
 *
 * // Register initial keys
 * manager.registerKeys('stripe', [
 *   {
 *     key: 'whsec_primary',
 *     version: 'v2',
 *     isPrimary: true,
 *     activeFrom: new Date(),
 *   }
 * ]);
 *
 * // Rotate to a new secret
 * await manager.rotatePrimaryKey('stripe', {
 *   key: 'whsec_new_secret',
 *   version: 'v3',
 *   activeFrom: new Date(),
 * });
 * ```
 *
 * @public
 */
export class KeyRotationManager {
  private providerKeys = new Map<string, ProviderKeyEntry[]>()
  private cleanupTimer?: Timer
  private config: Required<KeyRotationConfig>

  /**
   * Constructs a new KeyRotationManager with the specified policy.
   *
   * @param config - Configuration for auto-cleanup, grace periods, and rotation hooks.
   */
  constructor(config: KeyRotationConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    if (this.config.enabled && this.config.autoCleanup) {
      this.startAutoCleanup()
    }
  }

  /**
   * Registers a collection of keys for a specific provider.
   *
   * Validation ensures that exactly one primary key is specified for the provider.
   *
   * @param providerName - Canonical name of the provider instance.
   * @param keys - Array of valid key entries with metadata.
   * @throws {Error} If no primary key is provided or if multiple primary keys are detected.
   */
  registerKeys(providerName: string, keys: ProviderKeyEntry[]): void {
    // Validate primary key presence and uniqueness
    const primaryKeys = keys.filter((k) => k.isPrimary)
    if (primaryKeys.length !== 1) {
      throw new Error(`Provider ${providerName} must have exactly one primary key`)
    }

    // Sort by activation date descending (newest first)
    const sorted = [...keys].sort((a, b) => b.activeFrom.getTime() - a.activeFrom.getTime())

    this.providerKeys.set(providerName, sorted)
  }

  /**
   * Retrieves all currently valid keys for a provider to attempt verification.
   *
   * A key is considered active if the current time is after its `activeFrom` date
   * and before its `expiresAt` date (if defined).
   *
   * @param providerName - Canonical name of the provider instance.
   * @returns An array of currently active key entries.
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
   * Retrieves the current primary key used for signature generation.
   *
   * @param providerName - Canonical name of the provider instance.
   * @returns The primary key entry, or null if no active primary key exists.
   */
  getPrimaryKey(providerName: string): ProviderKeyEntry | null {
    const keys = this.getActiveKeys(providerName)
    return keys.find((k) => k.isPrimary) ?? null
  }

  /**
   * Promotes a new primary key for the provider and retires the old one.
   *
   * The previous primary key is automatically assigned an expiration date based on
   * the configured `gracePeriod`, allowing it to remain valid for incoming requests
   * that were signed before the rotation propagated.
   *
   * @param providerName - Canonical name of the provider instance.
   * @param newKey - Metadata and secret for the new primary key.
   */
  async rotatePrimaryKey(
    providerName: string,
    newKey: Omit<ProviderKeyEntry, 'isPrimary'>
  ): Promise<void> {
    const existingKeys = this.providerKeys.get(providerName) ?? []

    // Mark old primary key as inactive and set expiration based on grace period
    const updatedKeys: ProviderKeyEntry[] = existingKeys.map((key) => ({
      ...key,
      isPrimary: false,
      expiresAt: key.isPrimary ? new Date(Date.now() + this.config.gracePeriod) : key.expiresAt,
    }))

    // Add the new primary key to the front of the list
    const primaryKey: ProviderKeyEntry = {
      ...newKey,
      isPrimary: true,
    }

    updatedKeys.unshift(primaryKey)
    this.providerKeys.set(providerName, updatedKeys)

    this.config.onRotate(providerName, primaryKey)
  }

  /**
   * Manually triggers a purge of all expired keys across all providers.
   *
   * @returns The total number of keys removed during this cycle.
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
   * Initializes the background timer for periodic key purging.
   */
  private startAutoCleanup(): void {
    // Execute cleanup once per hour
    this.cleanupTimer = setInterval(
      () => {
        const cleaned = this.cleanupExpiredKeys()
        if (cleaned > 0) {
          console.log(`[KeyRotationManager] Cleaned up ${cleaned} expired keys`)
        }
      },
      60 * 60 * 1000
    )
    this.cleanupTimer.unref?.()
  }

  /**
   * Stops the auto-cleanup background process.
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
  }

  /**
   * Provides a read-only snapshot of all keys across all providers.
   *
   * @returns A map of provider names to their complete key history.
   */
  getAllProviderKeys(): Map<string, ProviderKeyEntry[]> {
    return new Map(this.providerKeys)
  }

  /**
   * Checks if a specific provider has any keys registered in the manager.
   *
   * @param providerName - Canonical name of the provider instance.
   * @returns True if the provider is tracked.
   */
  hasProvider(providerName: string): boolean {
    return this.providerKeys.has(providerName)
  }
}
