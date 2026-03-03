/**
 * HasSerialization Concern
 * @description Provides serialization functionality including converting to JSON, array/object, and handling hidden/appended attributes.
 */
export declare class HasSerialization {
  /**
   * Fill the model instance with an object of attributes.
   *
   * @param attributes - Key-value pairs of attributes to set
   * @returns The model instance
   *
   * @example
   * ```typescript
   * user.fill({ name: 'Carl', email: 'carl@example.com' })
   * ```
   */
  fill(attributes: Record<string, unknown>): this
  /**
   * Convert the model instance to a JSON string.
   *
   * @returns A JSON string representation of the model
   *
   * @example
   * ```typescript
   * const json = user.toJSON()
   * ```
   */
  toJSON(): unknown
  /**
   * Convert the model instance to a plain JavaScript object.
   * Alias for `toJSON()`.
   *
   * @returns A plain object representation of the model
   */
  toObject(): Record<string, unknown>
  /**
   * Convert the model instance to a plain JavaScript object.
   * Alias for `toJSON()`.
   *
   * @returns A plain object representation of the model
   */
  toArray(): Record<string, unknown>
  /**
   * Get all attributes currently set on the model.
   *
   * @returns An object containing all model attributes
   * @internal
   */
  getAttributes(): Record<string, unknown>
  /**
   * Get a specific attribute value.
   *
   * @param key - The attribute name
   * @returns The attribute value
   * @internal
   */
  getAttribute(key: string): unknown
  /**
   * Get the string representation of the model.
   *
   * @returns A JSON string representation of the model
   */
  toString(): string
}
