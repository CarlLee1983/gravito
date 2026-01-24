import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('oauth_identities', (table) => {
    table.bigIncrements('id').primary()
    table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
    table.string('provider', 50).notNullable()
    table.string('provider_id').notNullable()
    table.text('access_token').nullable()
    table.text('refresh_token').nullable()
    table.timestamp('expires_at').nullable()
    table.json('metadata').nullable()
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable()

    table.unique(['provider', 'provider_id'])
    table.index(['user_id', 'provider'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('oauth_identities')
}
