import { Schema } from '@gravito/atlas'

export default class CreateWorkflowDemoTables {
  async up() {
    await Schema.create('users', (table) => {
      table.uuid('id').primary()
      table.string('email').unique()
      table.string('name')
      table.string('password')
      table.timestamps()
    })

    await Schema.create('api_tokens', (table) => {
      table.uuid('id').primary()
      table.uuid('user_id').constrained('users').onDelete('cascade')
      table.string('token').unique()
      table.timestamps()
    })

    await Schema.create('products', (table) => {
      table.uuid('id').primary()
      table.string('name')
      table.string('sku').unique()
      table.decimal('price', 10, 2)
      table.integer('inventory')
      table.timestamps()
    })

    await Schema.create('settings', (table) => {
      table.uuid('id').primary()
      table.uuid('user_id').constrained('users').onDelete('cascade')
      table.enum('theme', ['light', 'dark']).default('light')
      table.boolean('notifications').default(true)
      table.timestamps()
    })
  }

  async down() {
    await Schema.dropIfExists('settings')
    await Schema.dropIfExists('products')
    await Schema.dropIfExists('api_tokens')
    await Schema.dropIfExists('users')
  }
}
