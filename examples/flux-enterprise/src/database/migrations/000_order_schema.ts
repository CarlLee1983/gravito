import { Schema } from '@gravito/atlas'

export default class CreateFluxEnterpriseTables {
  async up() {
    await Schema.create('flux_orders', (table) => {
      table.uuid('id').primary()
      table.string('workflow_id').unique()
      table.string('order_id')
      table.json('payload').nullable()
      table.boolean('succeeded').default(false)
      table.timestamps()
    })
  }

  async down() {
    await Schema.dropIfExists('flux_orders')
  }
}
