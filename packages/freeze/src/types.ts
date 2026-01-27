/**
 * @gravito/freeze - Branded Types
 */

/**
 * A string representing a validated locale identifier.
 *
 * Uses TypeScript's branded type pattern to distinguish locale strings
 * from plain strings at compile time, preventing accidental misuse.
 *
 * @remarks
 * This is a branded type - runtime behavior is identical to `string`,
 * but TypeScript enforces type safety. Always use {@link asLocale} to
 * construct values of this type.
 *
 * @example
 * ```typescript
 * const locale: Locale = asLocale('en')
 * // Type error - cannot assign string directly
 * // const invalid: Locale = 'en'
 * ```
 */
export type Locale = string & { readonly __brand: unique symbol }

/**
 * A string representing a validated absolute path (starting with '/').
 *
 * Uses TypeScript's branded type pattern to enforce that paths always
 * begin with a forward slash, preventing relative path bugs.
 *
 * @remarks
 * This is a branded type - runtime behavior is identical to `string`,
 * but TypeScript enforces type safety. Always use {@link asAbsolutePath}
 * to construct values of this type.
 *
 * @example
 * ```typescript
 * const path: AbsolutePath = asAbsolutePath('/docs/guide')
 * // Type error - cannot assign string directly
 * // const invalid: AbsolutePath = '/docs'
 * ```
 */
export type AbsolutePath = string & { readonly __brand: unique symbol }

/**
 * Casts a string to the Locale branded type.
 *
 * Performs no runtime validation - use this only when you're certain
 * the string is a valid locale identifier. For validation against a
 * list of supported locales, check the value before casting.
 *
 * @param value - The locale identifier string (e.g., 'en', 'zh-TW')
 * @returns The same string branded as Locale type
 *
 * @example
 * ```typescript
 * // Basic usage
 * const locale = asLocale('en')
 *
 * // With validation
 * const supportedLocales = ['en', 'zh']
 * if (supportedLocales.includes(userLocale)) {
 *   const locale = asLocale(userLocale)
 * }
 * ```
 */
export function asLocale(value: string): Locale {
  return value as Locale
}

/**
 * Casts a string to the AbsolutePath branded type with validation.
 *
 * Ensures the path starts with a forward slash before casting.
 * This enforces that all paths are absolute, preventing routing bugs
 * in SSG scenarios.
 *
 * @param value - The path string to validate and cast
 * @returns The validated string branded as AbsolutePath type
 * @throws {Error} When the path doesn't start with '/'
 *
 * @example
 * ```typescript
 * // Valid usage
 * const path = asAbsolutePath('/docs/guide')
 *
 * // Throws error
 * try {
 *   asAbsolutePath('docs/guide') // Missing leading slash
 * } catch (error) {
 *   console.error(error.message) // "Invalid absolute path: docs/guide. Must start with '/'."
 * }
 * ```
 */
export function asAbsolutePath(value: string): AbsolutePath {
  if (!value.startsWith('/')) {
    throw new Error(`Invalid absolute path: ${value}. Must start with '/'.`)
  }
  return value as AbsolutePath
}
