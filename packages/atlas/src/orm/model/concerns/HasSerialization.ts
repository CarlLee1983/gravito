/**
 * HasSerialization Concern
 *
 * Provides serialization functionality including:
 * - Converting to JSON
 * - Converting to array/object
 * - Hiding/appending attributes
 */

export class HasSerialization {
  /**
   * Convert model to JSON
   *
   * @returns JSON string
   */
  toJSON(): string {
    return JSON.stringify(this.toArray())
  }

  /**
   * Convert model to array
   *
   * @returns Model as array
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
      for (const [key, value] of Object.entries(attributes)) {
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
   * Convert model to object
   *
   * @returns Model as object
   */
  toObject(): Record<string, unknown> {
    return this.toArray()
  }

  /**
   * Get attributes
   *
   * @returns All attributes
   */
  getAttributes(): Record<string, unknown> {
    return (this as any)._attributes || {}
  }

  /**
   * Get attribute value
   *
   * @param key - Attribute key
   * @returns Attribute value
   */
  getAttribute(key: string): unknown {
    const attributes = (this as any)._attributes || {}
    return attributes[key]
  }

  /**
   * String representation
   *
   * @returns JSON string
   */
  toString(): string {
    return this.toJSON()
  }
}
