/**
 * Utility to clean up request data.
 */
export class Sanitizer {
  /**
   * Recursively trim strings and convert empty strings to null.
   */
  public static clean(data: any): any {
    if (!data || typeof data !== 'object') {
      return data
    }

    const cleaned: any = Array.isArray(data) ? [] : {}

    for (const key in data) {
      let value = data[key]

      if (typeof value === 'string') {
        value = value.trim()
        if (value === '') {
          value = null
        }
      } else if (typeof value === 'object' && value !== null) {
        value = this.clean(value)
      }

      cleaned[key] = value
    }

    return cleaned
  }
}
