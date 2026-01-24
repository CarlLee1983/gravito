import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('personal_access_tokens', (table) => {
    table.bigIncrements('id').primary()
    table.string('tokenable_type', 100).notNullable()
    table.bigInteger('tokenable_id').notNullable()
    table.string('name', 255).notNullable()
    table.string('token', 64).notNullable().unique()
    table.json('abilities').nullable()
    table.timestamp('last_used_at').nullable()
    table.timestamp('expires_at').nullable()
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable()

    table.index(['tokenable_type', 'tokenable_id'])
    table.index('token')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('personal_access_tokens')
}
