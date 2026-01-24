import { type Blueprint, Schema } from '@gravito/atlas'

/**
 * Create auth events table
 *
 * This docstring is necessary as it documents the purpose of this database migration.
 */
export async function up(): Promise<void> {
  await Schema.create('auth_events', (table: Blueprint) => {
    table.id()
    table.string('type', 50)
    table.bigInteger('user_id').nullable()
    table.string('email', 255).nullable()
    table.string('ip_address', 45)
    table.text('user_agent').nullable()
    table.boolean('success').default(true)
    table.json('metadata').nullable()
    table.timestamp('created_at').nullable()

    table.index(['user_id', 'created_at'])
    table.index(['email', 'type', 'created_at'])
    table.index('type')
  })
}

export async function down(): Promise<void> {
  await Schema.dropIfExists('auth_events')
}
