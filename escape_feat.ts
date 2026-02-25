/**
 * Runtime HTML escape abstraction.
 *
 * Provides unified HTML escaping across Bun, Node.js, and Deno runtimes.
 * Bun uses the native C++ `Bun.escapeHTML()` for 10-100x better performance.
 * Node.js/Deno fall back to manual entity replacement.
 *
 * @module runtime/escape
 * @since 3.4.0
 */

import { getRuntimeKind } from './detection'

/**
 * HTML escape function type.
 * @public
 */
export type EscapeHtmlFn = (value: string) => string

/**
 * Creates a fallback HTML escape function using .replace() chains.
 *
 * Escapes 5 special characters: &, <, >, ", '
 * Each is replaced with its HTML entity equivalent.
 *
 * @returns HTML escape function
 * @internal
 */
function createFallbackEscapeHtml(): EscapeHtmlFn {
  return (value: string): string => {
    if (!value) {
      return ''
    }
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }
}

// ============ Singleton ============

let escapeHtmlFn: EscapeHtmlFn | null = null

/**
 * Get the HTML escape function (auto-selects best implementation based on runtime).
 *
 * - Bun: Uses native C++ `Bun.escapeHTML()` (10-100x faster, SIMD accelerated)
 * - Node.js/Deno/Unknown: Uses .replace() chain fallback with same behavior
 *
 * @returns HTML escape function
 * @public
 *
 * @example
 * ```typescript
 * import { getEscapeHtml } from '@gravito/core'
 *
 * const escapeHtml = getEscapeHtml()
 * const safe = escapeHtml('<script>alert("xss")</script>')
 * // '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 * ```
 */
export function getEscapeHtml(): EscapeHtmlFn {
  if (escapeHtmlFn) {
    return escapeHtmlFn
  }

  const kind = getRuntimeKind()
  if (kind === 'bun' && typeof Bun !== 'undefined' && typeof Bun.escapeHTML === 'function') {
    escapeHtmlFn = (value: string): string => {
      if (!value) {
        return ''
      }
      return Bun.escapeHTML(value)
    }
  } else {
    escapeHtmlFn = createFallbackEscapeHtml()
  }

  return escapeHtmlFn
}
