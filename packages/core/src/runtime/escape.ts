/**
 * Runtime HTML escape adapter implementations.
 *
 * Provides unified HTML entity escaping across Bun, Node.js, and Deno runtimes.
 * Bun environment uses native Bun.escapeHTML() for 10-100x performance improvement.
 *
 * @module runtime/escape
 * @since 3.3.0
 */

import { getRuntimeKind } from './detection'

/**
 * HTML escape function interface
 * @public
 */
export type EscapeHtmlFn = (value: string) => string

/**
 * Fallback HTML escape implementation using string replacement chain.
 * Converts 5 HTML special characters: &, <, >, ", '
 * @internal
 */
function createFallbackEscapeHtml(): EscapeHtmlFn {
  return (value: string): string => {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
  }
}

/**
 * Create Bun native HTML escape using Bun.escapeHTML()
 * @internal
 */
function createBunEscapeHtml(): EscapeHtmlFn {
  return (value: string): string => {
    if (typeof Bun === 'undefined' || typeof (Bun as any).escapeHTML !== 'function') {
      return createFallbackEscapeHtml()(value)
    }
    return (Bun as any).escapeHTML(value)
  }
}

// ============ Singleton ============

let escapeHtmlFn: EscapeHtmlFn | null = null

/**
 * Get HTML escape function optimized for the current runtime.
 *
 * In Bun environment, uses native Bun.escapeHTML() for maximum performance.
 * In Node.js/Deno/Unknown runtime, uses fallback implementation with string replacement.
 *
 * The function escapes 5 HTML special characters:
 * - & → &amp;
 * - < → &lt;
 * - > → &gt;
 * - " → &quot;
 * - ' → &#x27;
 *
 * @returns HTML escape function
 *
 * @example
 * ```typescript
 * const escapeHtml = getEscapeHtml()
 * const safe = escapeHtml('<script>alert("xss")</script>')
 * // Output: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;
 * ```
 *
 * @public
 * @since 3.3.0
 */
export function getEscapeHtml(): EscapeHtmlFn {
  if (escapeHtmlFn) {
    return escapeHtmlFn
  }

  const kind = getRuntimeKind()
  if (kind === 'bun') {
    escapeHtmlFn = createBunEscapeHtml()
  } else {
    escapeHtmlFn = createFallbackEscapeHtml()
  }

  return escapeHtmlFn
}
