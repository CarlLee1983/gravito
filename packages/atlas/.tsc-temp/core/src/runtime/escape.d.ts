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
/**
 * HTML escape function type.
 * @public
 */
export type EscapeHtmlFn = (value: string) => string
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
export declare function getEscapeHtml(): EscapeHtmlFn
