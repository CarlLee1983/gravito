import { type Blueprint, Schema } from '@gravito/atlas'

/**
 * Create personal access tokens table
 *
 * This docstring is necessary as it documents the purpose of this database migration.
 */
export async function up(): Promise<void> {
  await Schema.create('personal_access_tokens', (table: Blueprint) => {
    table.id()
    table.string('tokenable_type', 100)
    table.bigInteger('tokenable_id')
    table.string('name', 255)
    table.string('token', 64).unique()
    table.json('abilities').nullable()
    table.timestamp('last_used_at').nullable()
    table.timestamp('expires_at').nullable()
    table.timestamp('created_at').nullable()
    table.timestamp('updated_at').nullable()

    table.index(['tokenable_type', 'tokenable_id'])
    table.index('token')
  })
}

export async function down(): Promise<void> {
  await Schema.dropIfExists('personal_access_tokens')
}
