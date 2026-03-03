/**
 * Dirty Tracker for monitoring attribute modifications on model instances.
 *
 * Maintains a snapshot of original values and tracks which keys have been
 * changed. Supports optimized structural comparison and deep change detection
 * for complex objects.
 *
 * @template T - The shape of the model attributes.
 */
export declare class DirtyTracker<T extends Record<string, unknown>> {
  /**
   * Stores the initial values as retrieved from the database.
   */
  private original
  /**
   * Tracks keys that differ from their original state.
   */
  private dirty
  /**
   * When enabled, nested objects are compared recursively.
   */
  private useDeepComparison
  /**
   * Configures the comparison strategy for nested structures.
   *
   * @param enabled - True to enable recursive comparison.
   */
  setDeepComparison(enabled: boolean): void
  /**
   * Records initial state and clears the dirty set.
   *
   * Called typically during hydration or after a successful save.
   *
   * @param data - The baseline values.
   */
  setOriginal(data: Partial<T>): void
  /**
   * Checks for changes and updates the dirty set accordingly.
   *
   * Compares the new value against the original. If they match, the key
   * is removed from the dirty set (reversion).
   *
   * @param key - The attribute name.
   * @param newValue - The proposed new value.
   */
  mark(key: keyof T, newValue: unknown): void
  /**
   * Indicates if any attributes or a specific attribute has been modified.
   *
   * @param key - Optional specific attribute to check.
   * @returns True if changes are detected.
   */
  isDirty(key?: keyof T): boolean
  /**
   * Returns a list of all modified attribute names.
   */
  getDirty(): Array<keyof T>
  /**
   * Extracts current values for all dirty attributes.
   *
   * @param current - The source object containing all current values.
   * @returns An object with only the modified entries.
   */
  getDirtyValues(current: Partial<T>): Partial<T>
  /**
   * Retrieves the original value of an attribute from the snapshot.
   */
  getOriginal(key: keyof T): unknown
  /**
   * Retrieves the complete original snapshot.
   */
  getOriginals(): Partial<T>
  /**
   * Synchronizes the snapshot with the current state.
   *
   * @param data - The new baseline data.
   */
  sync(data: Partial<T>): void
  /**
   * Reverts the dirty flag for a specific attribute.
   */
  reset(key: keyof T): void
  /**
   * Clears all tracking information.
   */
  resetAll(): void
  /**
   * Compares two values for equality using optimized structural comparison.
   *
   * Performs shallow comparison by default. When deep comparison is enabled,
   * uses the optimized deep equality adapter from the runtime abstraction layer.
   *
   * @param a - First value.
   * @param b - Second value.
   * @returns True if equal.
   * @internal
   */
  private isEqual
  /**
   * Clones a value to ensure the original snapshot remains immutable.
   *
   * @param value - Value to clone.
   * @internal
   */
  private cloneValue
  /**
   * Performs recursive deep cloning.
   * @internal
   */
  private deepClone
}
