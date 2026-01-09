import { type Blueprint, Schema } from '@gravito/atlas'

export default {
  async up() {
    // 1. Cart Master Table
    await Schema.create('carts', (table: Blueprint) => {
      table.string('id').primary()
      table.string('member_id').nullable().unique() // 會員唯一購物車
      table.string('guest_id').nullable().unique() // 訪客標識 (UUID)
      table.timestamp('created_at').default('CURRENT_TIMESTAMP')
      table.timestamp('last_activity_at').default('CURRENT_TIMESTAMP')
      table.text('metadata').nullable()
    })

    // 2. Cart Items
    await Schema.create('cart_items', (table: Blueprint) => {
      table.string('id').primary()
      table.string('cart_id')
      table.string('variant_id') // 關聯至 Catalog 的 Variant
      table.integer('quantity').default(1)
      table.timestamp('created_at').default('CURRENT_TIMESTAMP')
      table.timestamp('updated_at').nullable()

      table.index(['cart_id'])
    })
  },

  async down() {
    await Schema.dropIfExists('cart_items')
    await Schema.dropIfExists('carts')
  },
}
