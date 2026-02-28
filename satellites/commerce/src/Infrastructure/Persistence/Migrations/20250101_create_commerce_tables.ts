import { type Blueprint, Schema } from '@gravito/atlas'

/**
 * Migration to create Commerce tables and Patch inventory for Optimistic Locking.
 */
export default {
  async up() {
    // 1. Orders Table
    // 注意：金額以整數儲存（分），避免浮點精度問題
    // 例如 99.99 TWD = 9999 (cents)
    await Schema.create('orders', (table: Blueprint) => {
      table.string('id').primary()
      table.string('member_id').nullable()
      table.string('idempotency_key').unique().nullable()
      table
        .enum('status', [
          'pending',
          'paid',
          'processing',
          'shipped',
          'completed',
          'cancelled',
          'requested_refund',
          'refunded',
        ])
        .default('pending')
      table.bigInteger('subtotal_amount').default(0) // 金額（分）
      table.bigInteger('adjustment_amount').default(0) // 調整金額（分）
      table.bigInteger('total_amount').default(0) // 總金額（分）
      table.string('currency').default('TWD')
      table.timestamp('created_at').default('CURRENT_TIMESTAMP')
      table.timestamp('updated_at').nullable()
      table.text('metadata').nullable()
    })

    // 2. Order Items (Snapshotting)
    // 商品快照，記錄訂單建立時的商品資訊（包含已刪除的商品）
    await Schema.create('order_items', (table: Blueprint) => {
      table.string('id').primary()
      table.string('order_id')
      table.string('product_id')
      table.string('variant_id')
      table.string('sku')
      table.string('name')
      table.bigInteger('unit_price').default(0) // 單價（分）
      table.integer('quantity')
      table.bigInteger('total_price').default(0) // 總價（分）
      table.text('options').nullable() // JSON 格式選項
    })

    // 3. Order Adjustments (Marketing/Tax/Shipping)
    // 金額調整（折扣、運費、稅務等）
    await Schema.create('order_adjustments', (table: Blueprint) => {
      table.string('id').primary()
      table.string('order_id')
      table.enum('type', ['discount', 'shipping', 'tax', 'surcharge']).default('discount')
      table.string('label') // e.g., "Christmas Sale -10%", "Shipping Fee"
      table.bigInteger('amount').default(0) // 金額（分）
      table.string('source_type').nullable() // e.g., "coupon", "tax"
      table.string('source_id').nullable()
    })

    // NOTE: Optimistic Locking 應由 Catalog Satellite 管理
    // Commerce Satellite 應透過事件而非直接修改 product_variants 表
    // 庫存扣減應由 commerce:order-placed Hook 觸發 Catalog 的庫存更新
  },

  async down() {
    await Schema.dropIfExists('order_adjustments')
    await Schema.dropIfExists('order_items')
    await Schema.dropIfExists('orders')
    // We don't drop 'version' column in down to avoid losing catalog data
  },
}
