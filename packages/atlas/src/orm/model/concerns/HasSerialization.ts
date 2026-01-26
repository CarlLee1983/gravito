/**
 * HasSerialization Concern
 * @description Provides serialization functionality including converting to JSON, array/object, and handling hidden/appended attributes.
 */
export class HasSerialization {
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
  toJSON(): string {
    return JSON.stringify(this.toArray())
  }

  /**
   * Convert the model instance to a plain JavaScript object.
   * Respects `visible`, `hidden`, and `appends` static configurations.
   *
   * @returns A plain object representation of the model
   *
   * @example
   * ```typescript
   * const data = user.toArray()
   * ```
   */
  toArray(): Record<string, unknown> {
    const modelCtor = this.constructor as any
    const attributes = this.getAttributes()

    // Get hidden attributes
    const hidden = modelCtor.hidden || []

    // Get visible attributes (if specified)
    const visible = modelCtor.visible || []

    // Get appends
    const appends = modelCtor.appends || []

    let result: Record<string, unknown>

    if (visible.length > 0) {
      // Only include visible attributes
      result = {}
      for (const key of visible) {
        if (key in attributes) {
          result[key] = attributes[key]
        }
      }
    } else {
      // Include all except hidden
      result = {}
      for (const [key, _value] of Object.entries(attributes)) {
        if (!hidden.includes(key)) {
          result[key] = attributes[key]
        }
      }
    }

    // Add appends
    for (const key of appends) {
      const accessor = `get${key.charAt(0).toUpperCase() + key.slice(1)}Attribute`
      if (typeof (this as any)[accessor] === 'function') {
        result[key] = (this as any)[accessor].call(this)
      }
    }

    return result
  }

  /**
   * Convert the model instance to a plain JavaScript object.
   * Alias for `toArray()`.
   *
   * @returns A plain object representation of the model
   */
  toObject(): Record<string, unknown> {
    return this.toArray()
  }

  /**
   * Get all attributes currently set on the model.
   *
   * @returns An object containing all model attributes
   * @internal
   */
  getAttributes(): Record<string, unknown> {
    return (this as any)._attributes || {}
  }

  /**
   * Get a specific attribute value.
   *
   * @param key - The attribute name
   * @returns The attribute value
   * @internal
   */
  getAttribute(key: string): unknown {
    const attributes = (this as any)._attributes || {}
    return attributes[key]
  }

  /**
   * Get the string representation of the model.
   *
   * @returns A JSON string representation of the model
   */
  toString(): string {
    return this.toJSON()
  }
}
