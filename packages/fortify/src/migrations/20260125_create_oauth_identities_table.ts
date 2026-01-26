import { type Blueprint, Schema } from '@gravito/atlas'

/**
 * Create oauth identities table
 *
 * This docstring is necessary as it documents the purpose of this database migration.
 */
export async function up(): Promise<void> {
  await Schema.create('oauth_identities', (table: Blueprint) => {
    table.id()
    table.bigInteger('user_id')
    table.string('provider', 50)
    table.string('provider_id')
    table.text('access_token').nullable()
    table.text('refresh_token').nullable()
    table.timestamp('expires_at').nullable()
    table.json('metadata').nullable()
    table.timestamp('created_at').nullable()
    table.timestamp('updated_at').nullable()

    table.unique(['provider', 'provider_id'])
    table.index(['user_id', 'provider'])
  })
}

export async function down(): Promise<void> {
  await Schema.dropIfExists('oauth_identities')
}
