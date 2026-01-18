/**
 * @fileoverview Engine Constants & Cached Buffers
 *
 * Pre-allocated resources to minimize runtime allocation overhead.
 * Specifically targets Bun's zero-copy capabilities.
 */

const encoder = new TextEncoder()

// Pre-encoded JSON responses for common scenarios
export const CACHED_RESPONSES = {
  NOT_FOUND: encoder.encode('{"error":"Not Found"}'),
  INTERNAL_ERROR: encoder.encode('{"error":"Internal Server Error"}'),
  OK: encoder.encode('{"ok":true}'),
  EMPTY: new Uint8Array(0),
} as const

// Content-Type constants (avoid string allocation)
export const HEADERS = {
  JSON: { 'Content-Type': 'application/json; charset=utf-8' },
  TEXT: { 'Content-Type': 'text/plain; charset=utf-8' },
  HTML: { 'Content-Type': 'text/html; charset=utf-8' },
} as const
