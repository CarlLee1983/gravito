/**
 * @gravito/atlas - Cursor Encoding Utility
 * @description Base64 encode/decode for cursor-based pagination cursors.
 *
 * Cursor format: base64(JSON({ id, sortValue, sortColumn, direction }))
 * This enables O(1) pagination using tuple comparison SQL:
 *   WHERE (sort_col, id) > (val, id_val)
 */
export interface CursorPayload {
  /**
   * Primary key value of the last/first record in the current page
   */
  id: unknown
  /**
   * Value of the sort column at the cursor boundary
   */
  sortValue: unknown
  /**
   * Column name used for sorting
   */
  sortColumn: string
  /**
   * Sort direction
   */
  direction: 'asc' | 'desc'
}
/**
 * Encode a cursor payload to an opaque base64 string.
 *
 * @param payload - Cursor data to encode
 * @returns Base64-encoded cursor string
 *
 * @example
 * const cursor = encodeCursor({ id: 42, sortValue: '2026-01-01', sortColumn: 'created_at', direction: 'asc' })
 */
export declare function encodeCursor(payload: CursorPayload): string
/**
 * Decode a cursor string back to its payload.
 *
 * @param cursor - Base64 cursor string
 * @returns Decoded cursor payload
 * @throws {Error} If the cursor is malformed or tampered with
 *
 * @example
 * const payload = decodeCursor(cursor)
 * // payload.id, payload.sortValue, etc.
 */
export declare function decodeCursor(cursor: string): CursorPayload
/**
 * Build the WHERE clause raw SQL and bindings for cursor pagination.
 *
 * For ascending sort: WHERE (sort_col, id) > (sort_val, id_val)
 * For descending sort: WHERE (sort_col, id) < (sort_val, id_val)
 *
 * Uses tuple comparison which is O(1) on indexed columns in Postgres & MySQL.
 *
 * @param payload - Decoded cursor payload
 * @returns { sql, bindings } ready for whereRaw()
 */
export declare function buildCursorWhereClause(
  payload: CursorPayload,
  idColumn?: string
): {
  sql: string
  bindings: unknown[]
}
