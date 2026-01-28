import type { Model } from '../Model'

/**
 * HasSerialization Concern
 * @description Provides serialization functionality including converting to JSON, array/object, and handling hidden/appended attributes.
 */
export class HasSerialization {
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
  fill(attributes: Record<string, unknown>): this {
    for (const [key, value] of Object.entries(attributes)) {
      ;(this as any)._setAttribute(key, value)
    }
    return this
  }

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
  toJSON(): any {
    const modelCtor = this.constructor as typeof Model & {
      appends: string[]
      visible: string[]
      hidden: string[]
    }
    const attributes = { ...(this as any)._attributes }
    const result: any = {}

    // 1. Process attributes (trigger accessors)
    for (const key of Object.keys(attributes)) {
      if (key.startsWith('_')) {
        continue
      }
      result[key] = (this as any)[key]
    }

    // 2. Process appends
    for (const key of modelCtor.appends || []) {
      result[key] = (this as any)[key]
    }

    // 3. Process relations (eager loaded on instance)
    // Note: Relations stored in _attributes are already covered by step 1.
    // This loop covers relations stored directly on the instance (legacy or custom loading).
    const instanceKeys = Object.keys(this)
    for (const key of instanceKeys) {
      if (key.startsWith('_')) {
        continue
      }
      if (key in result) {
        continue // already processed
      }

      const value = (this as any)[key]
      // Check if it's a Model or Array of Models (simple heuristic)
      if (
        (value &&
          typeof value === 'object' &&
          (value as any).constructor?.name !== 'Object' &&
          (value as any).constructor?.name !== 'Array') || // Model instance
        (Array.isArray(value) &&
          value.length > 0 &&
          (value[0] as any).constructor?.name !== 'Object') || // Array of Models
        (Array.isArray(value) && value.length === 0) // Empty relation array
      ) {
        result[key] = value
      }
    }

    // 4. Filter visible/hidden
    if (modelCtor.visible && modelCtor.visible.length > 0) {
      const filtered: any = {}
      for (const key of modelCtor.visible) {
        if (key in result) {
          filtered[key] = result[key]
        }
      }
      return filtered
    }

    if (modelCtor.hidden && modelCtor.hidden.length > 0) {
      for (const key of modelCtor.hidden) {
        delete result[key]
      }
    }

    return result
  }

  /**
   * Convert the model instance to a plain JavaScript object.
   * Alias for `toJSON()`.
   *
   * @returns A plain object representation of the model
   */
  toObject(): Record<string, unknown> {
    return this.toJSON()
  }

  /**
   * Convert the model instance to a plain JavaScript object.
   * Alias for `toJSON()`.
   *
   * @returns A plain object representation of the model
   */
  toArray(): Record<string, unknown> {
    return this.toJSON()
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
    return JSON.stringify(this.toJSON())
  }
}
