import type { Knex } from 'knex'

/**
 * Add account lockout columns to users table
 *
 * This migration adds:
 * - failed_login_attempts: Track consecutive failed login attempts
 * - locked_until: Timestamp when the account lockout expires
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.integer('failed_login_attempts').defaultTo(0).notNullable()
    table.timestamp('locked_until').nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('failed_login_attempts')
    table.dropColumn('locked_until')
  })
}
