import type { Database } from '@gravito/atlas'

export async function migrate(db: Database): Promise<void> {
  const hasAccountsTable = await db.schema.hasTable('accounts')
  if (!hasAccountsTable) {
    await db.schema.createTable('accounts', (table) => {
      table.text('id').primary()
      table.text('owner_name').notNullable()
      table.integer('balance').notNullable().defaultTo(0)
      table.text('currency').notNullable().defaultTo('TWD')
      table.text('status').notNullable().defaultTo('active')
      table.text('created_at').notNullable()
      table.text('updated_at').notNullable()
    })
  }

  const hasTransactionsTable = await db.schema.hasTable('transactions')
  if (!hasTransactionsTable) {
    await db.schema.createTable('transactions', (table) => {
      table.text('id').primary()
      table.text('account_id').notNullable()
      table.text('type').notNullable()
      table.integer('amount').notNullable()
      table.integer('balance_after').notNullable()
      table.text('currency').notNullable().defaultTo('TWD')
      table.text('reference_id').nullable()
      table.text('description').nullable()
      table.text('created_at').notNullable()
      table.foreign('account_id').references('accounts.id')
      table.index('account_id')
      table.index('created_at')
    })
  }
}
