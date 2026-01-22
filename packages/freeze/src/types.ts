/**
 * @gravito/freeze - Branded Types
 */

/**
 * A string that has been validated as a supported locale.
 */
export type Locale = string & { readonly __brand: unique symbol }

/**
 * A string that starts with a forward slash.
 */
export type AbsolutePath = string & { readonly __brand: unique symbol }

/**
 * Cast a string to Locale type.
 */
export function asLocale(value: string): Locale {
  return value as Locale
}

/**
 * Cast a string to AbsolutePath type.
 */
export function asAbsolutePath(value: string): AbsolutePath {
  if (!value.startsWith('/')) {
    throw new Error(`Invalid absolute path: ${value}. Must start with '/'.`)
  }
  return value as AbsolutePath
}
