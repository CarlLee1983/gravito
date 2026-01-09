import { type Blueprint, Schema } from '@gravito/atlas'

/**
 * Migration to create Commerce tables and Patch inventory for Optimistic Locking.
 */
export default {
  async up() {
    // 1. Orders Table
    await Schema.create('orders', (table: Blueprint) => {
      table.string('id').primary()
      table.string('member_id').nullable()
      table.string('idempotency_key').unique().nullable()
      table.string('status').default('pending') // pending, paid, processing, shipped, completed, cancelled
      table.decimal('subtotal_amount', 15, 2)
      table.decimal('adjustment_amount', 15, 2).default(0)
      table.decimal('total_amount', 15, 2)
      table.string('currency').default('TWD')
      table.timestamp('created_at').default('CURRENT_TIMESTAMP')
      table.timestamp('updated_at').nullable()
      table.text('metadata').nullable()
    })

    // 2. Order Items (Snapshotting)
    await Schema.create('order_items', (table: Blueprint) => {
      table.string('id').primary()
      table.string('order_id')
      table.string('variant_id')
      table.string('sku')
      table.string('name')
      table.decimal('unit_price', 15, 2)
      table.integer('quantity')
      table.decimal('total_price', 15, 2)
      table.text('options').nullable()
    })

    // 3. Order Adjustments (Marketing/Tax/Shipping)
    await Schema.create('order_adjustments', (table: Blueprint) => {
      table.string('id').primary()
      table.string('order_id')
      table.string('label') // e.g., "Christmas Sale -10%", "Shipping Fee"
      table.decimal('amount', 15, 2)
      table.string('source_type').nullable() // e.g., "coupon", "tax"
      table.string('source_id').nullable()
    })

    // 4. Patch Inventory for Optimistic Locking
    // We add 'version' to support atomic updates:
    // UPDATE ... SET stock = stock - ?, version = version + 1 WHERE id = ? AND version = ?
    try {
      await Schema.table('product_variants', (table: Blueprint) => {
        table.integer('version').default(1)
      })
    } catch (_e) {
      // Column might already exist, ignore in review environment
    }
  },

  async down() {
    await Schema.dropIfExists('order_adjustments')
    await Schema.dropIfExists('order_items')
    await Schema.dropIfExists('orders')
    // We don't drop 'version' column in down to avoid losing catalog data
  },
}
