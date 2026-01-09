import { type Blueprint, Schema } from '@gravito/atlas'

export default {
  async up() {
    // 1. Promotions (System-wide rules)
    await Schema.create('promotions', (table: Blueprint) => {
      table.string('id').primary()
      table.string('name')
      table.string('type') // e.g., "cart_threshold", "buy_x_get_y", "category_discount"
      table.text('configuration') // JSON: Store rules like { min_amount: 2000, discount: 200 }
      table.integer('priority').default(0)
      table.boolean('is_active').default(true)
      table.timestamp('starts_at').nullable()
      table.timestamp('ends_at').nullable()
      table.timestamp('created_at').default('CURRENT_TIMESTAMP')
    })

    // 2. Coupons (User-entered codes)
    await Schema.create('coupons', (table: Blueprint) => {
      table.string('id').primary()
      table.string('code').unique()
      table.string('name')
      table.string('type') // e.g., "fixed", "percent"
      table.decimal('value', 15, 2)
      table.text('configuration').nullable() // JSON: Constraints like { min_spend: 1000 }
      table.integer('usage_limit').nullable()
      table.integer('usage_count').default(0)
      table.boolean('is_active').default(true)
      table.timestamp('expires_at').nullable()
    })

    // 3. Coupon Usage Tracking
    await Schema.create('coupon_usages', (table: Blueprint) => {
      table.string('id').primary()
      table.string('coupon_id')
      table.string('member_id')
      table.string('order_id')
      table.timestamp('used_at').default('CURRENT_TIMESTAMP')
    })
  },

  async down() {
    await Schema.dropIfExists('coupon_usages')
    await Schema.dropIfExists('coupons')
    await Schema.dropIfExists('promotions')
  },
}
