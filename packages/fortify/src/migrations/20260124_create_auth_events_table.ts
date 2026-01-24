import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('auth_events', (table) => {
    table.bigIncrements('id').primary()
    table.string('type', 50).notNullable()
    table.bigInteger('user_id').nullable().references('id').inTable('users').onDelete('CASCADE')
    table.string('email', 255).nullable()
    table.string('ip_address', 45).notNullable()
    table.text('user_agent').nullable()
    table.boolean('success').defaultTo(true).notNullable()
    table.json('metadata').nullable()
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()

    table.index(['user_id', 'created_at'])
    table.index(['email', 'type', 'created_at'])
    table.index('type')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('auth_events')
}
