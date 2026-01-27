import { type Blueprint, Schema } from '@gravito/atlas'

/**
 * Create two factor tables
 *
 * This docstring is necessary as it documents the purpose of this database migration.
 */
export async function up(): Promise<void> {
  await Schema.table('users', (table: Blueprint) => {
    table.string('two_factor_secret').nullable()
    table.text('two_factor_recovery_codes').nullable()
    table.timestamp('two_factor_confirmed_at').nullable()
  })

  await Schema.create('two_factor_challenges', (table: Blueprint) => {
    table.id()
    table.bigInteger('user_id')
    table.string('code', 10).nullable()
    table.timestamp('expires_at')
    table.timestamp('verified_at').nullable()
    table.timestamp('created_at').nullable()
    table.index(['user_id', 'created_at'])
  })
}

export async function down(): Promise<void> {
  await Schema.dropIfExists('two_factor_challenges')
  await Schema.table('users', (table: Blueprint) => {
    table.dropColumn(['two_factor_secret', 'two_factor_recovery_codes', 'two_factor_confirmed_at'])
  })
}
