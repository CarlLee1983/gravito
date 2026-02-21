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
export function encodeCursor(payload: CursorPayload): string {
  const json = JSON.stringify(payload)
  return Buffer.from(json, 'utf8').toString('base64url')
}

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
export function decodeCursor(cursor: string): CursorPayload {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8')
    const payload = JSON.parse(json) as CursorPayload

    if (payload.id === undefined || payload.sortColumn === undefined) {
      throw new Error('Invalid cursor: missing required fields')
    }

    return payload
  } catch (error) {
    throw new Error(
      `Invalid cursor: ${error instanceof Error ? error.message : 'malformed base64 or JSON'}`
    )
  }
}

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
export function buildCursorWhereClause(
  payload: CursorPayload,
  idColumn = 'id'
): { sql: string; bindings: unknown[] } {
  const { id, sortValue, sortColumn, direction } = payload

  if (sortColumn === idColumn) {
    // Simple single-column cursor
    const operator = direction === 'asc' ? '>' : '<'
    return {
      sql: `${idColumn} ${operator} ?`,
      bindings: [id],
    }
  }

  // Tuple comparison for composite cursor
  const operator = direction === 'asc' ? '>' : '<'
  return {
    sql: `(${sortColumn}, ${idColumn}) ${operator} (?, ?)`,
    bindings: [sortValue, id],
  }
}
