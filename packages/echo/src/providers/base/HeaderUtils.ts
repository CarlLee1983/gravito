/**
 * Utilities for handling webhook headers.
 * @module @gravito/echo/providers/base
 */

/**
 * Retrieves a header value from a headers object.
 * Supports case-insensitive lookup by checking the original name and its lowercase version.
 *
 * @param headers - The headers object from the request.
 * @param name - The name of the header to retrieve.
 * @returns The first value of the header if found, otherwise undefined.
 *
 * @example
 * ```typescript
 * const sig = getHeader(headers, 'X-Webhook-Signature');
 * ```
 */
export function getHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

/**
 * Retrieves multiple header values at once.
 *
 * @param headers - The headers object from the request.
 * @param names - An array of header names to retrieve.
 * @returns A record mapping each requested name to its value or undefined.
 */
export function getHeaders(
  headers: Record<string, string | string[] | undefined>,
  names: string[]
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {}
  for (const name of names) {
    result[name] = getHeader(headers, name)
  }
  return result
}

/**
 * Checks if a specific header exists in the headers object.
 *
 * @param headers - The headers object from the request.
 * @param name - The name of the header to check.
 * @returns True if the header exists and is not undefined.
 */
export function hasHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string
): boolean {
  return getHeader(headers, name) !== undefined
}
