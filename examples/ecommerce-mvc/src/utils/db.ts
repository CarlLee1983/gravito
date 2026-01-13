/**
 * Database Utilities
 *
 * Helper functions for cross-database compatibility (SQLite/PostgreSQL).
 */

export const isPostgres = process.env.DB_CONNECTION === 'postgres'

/**
 * Transform SQL query for the active dialect.
 * Specifically handles placeholder conversion (? -> $n) for PostgreSQL.
 */
export function sql(query: string): string {
  if (!isPostgres) return query

  let i = 1
  return query.replace(/\?/g, () => `$${i++}`)
}

/**
 * Get boolean SQL literal for the active dialect.
 * Postgres: TRUE/FALSE
 * SQLite: 1/0
 */
export const TRUE = isPostgres ? 'TRUE' : '1'
export const FALSE = isPostgres ? 'FALSE' : '0'
