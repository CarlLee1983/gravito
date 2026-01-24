import { type Blueprint, Schema } from '@gravito/atlas'

/**
 * Add account lockout columns to users table
 *
 * This migration adds:
 * - failed_login_attempts: Track consecutive failed login attempts
 * - locked_until: Timestamp when the account lockout expires
 *
 * This docstring is necessary as it documents the purpose of this database migration.
 */
export async function up(): Promise<void> {
  await Schema.table('users', (table: Blueprint) => {
    table.integer('failed_login_attempts').default(0)
    table.timestamp('locked_until').nullable()
  })
}

export async function down(): Promise<void> {
  await Schema.table('users', (table: Blueprint) => {
    table.dropColumn(['failed_login_attempts', 'locked_until'])
  })
}
