/**
 * @fileoverview Engine Constants & Cached Buffers
 *
 * Pre-allocated resources to minimize runtime allocation overhead.
 * Specifically targets Bun's zero-copy capabilities.
 */
export declare const CACHED_RESPONSES: {
  readonly NOT_FOUND: Uint8Array<ArrayBuffer>
  readonly INTERNAL_ERROR: Uint8Array<ArrayBuffer>
  readonly OK: Uint8Array<ArrayBuffer>
  readonly EMPTY: Uint8Array<ArrayBuffer>
}
export declare const HEADERS: {
  readonly JSON: {
    readonly 'Content-Type': 'application/json; charset=utf-8'
  }
  readonly TEXT: {
    readonly 'Content-Type': 'text/plain; charset=utf-8'
  }
  readonly HTML: {
    readonly 'Content-Type': 'text/html; charset=utf-8'
  }
}
