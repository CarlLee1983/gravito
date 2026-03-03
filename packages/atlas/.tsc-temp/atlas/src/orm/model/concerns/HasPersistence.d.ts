/**
 * HasPersistence Concern
 * @description Provides database persistence functionality including saving, deleting, and refreshing.
 */
export declare class HasPersistence {
  /**
   * Indicates if the model exists in the database.
   * @internal
   */
  protected _exists: boolean
  /**
   * Check if the model instance exists in the database.
   *
   * @returns True if the model has been persisted
   */
  get exists(): boolean
  /**
   * Internal helper to retrieve the correct connection depending on sharding configuration
   * @internal
   */
  protected _getConnection(): import('../../../types').ConnectionContract
  /**
   * Internal helper to resolve the target table for write operations.
   * Supports transparent partition routing.
   * @internal
   */
  protected _resolveWriteTable(): string
  /**
   * Save the model instance to the database (insert or update).
   *
   * @returns A promise that resolves to the model instance
   *
   * @example
   * ```typescript
   * await user.save()
   * ```
   */
  save(): Promise<this>
  /**
   * Perform an insert operation for a new model instance.
   *
   * @returns A promise that resolves to the model instance
   * @internal
   */
  protected _performInsert(): Promise<this>
  /**
   * Perform an update operation for an existing model instance.
   *
   * @returns A promise that resolves to the model instance
   * @internal
   */
  protected _performUpdate(): Promise<this>
  /**
   * Delete the model instance from the database.
   * Supports soft deletes if configured on the model.
   *
   * @returns A promise that resolves to true if deleted successfully
   *
   * @example
   * ```typescript
   * await user.delete()
   * ```
   */
  delete(): Promise<boolean>
  /**
   * Restore a soft-deleted model instance.
   *
   * @returns A promise that resolves to true
   *
   * @example
   * ```typescript
   * await user.restore()
   * ```
   */
  restore(): Promise<boolean>
  /**
   * Force a hard delete even if soft deletes are enabled.
   *
   * @returns A promise that resolves to true
   *
   * @example
   * ```typescript
   * await user.forceDelete()
   * ```
   */
  forceDelete(): Promise<boolean>
  /**
   * Refresh the model instance with fresh data from the database.
   *
   * @returns A promise that resolves to the model instance
   *
   * @example
   * ```typescript
   * await user.refresh()
   * ```
   */
  refresh(): Promise<this>
}
