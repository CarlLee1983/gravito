import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.string('two_factor_secret').nullable()
    table.text('two_factor_recovery_codes').nullable()
    table.timestamp('two_factor_confirmed_at').nullable()
  })

  await knex.schema.createTable('two_factor_challenges', (table) => {
    table.bigIncrements('id').primary()
    table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
    table.string('code', 10).nullable()
    table.timestamp('expires_at').notNullable()
    table.timestamp('verified_at').nullable()
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    table.index(['user_id', 'created_at'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('two_factor_challenges')
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('two_factor_secret')
    table.dropColumn('two_factor_recovery_codes')
    table.dropColumn('two_factor_confirmed_at')
  })
}
