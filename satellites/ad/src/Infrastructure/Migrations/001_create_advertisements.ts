import { type Blueprint, Schema } from '@gravito/atlas'

/**
 * 建立 advertisements 資料表
 *
 * 儲存廣告基本資訊、排程、權重及狀態。
 */
export default {
  async up() {
    await Schema.create('advertisements', (table: Blueprint) => {
      table.string('id').primary()
      table.string('slot_slug')
      table.string('title')
      table.string('image_url')
      table.string('target_url')
      table.integer('weight').default(5)
      table.enum('status', ['draft', 'active', 'paused']).default('draft')
      table.timestamp('starts_at')
      table.timestamp('ends_at')
      table.text('metadata').nullable()
      table.timestamp('created_at').default('CURRENT_TIMESTAMP')
      table.timestamp('updated_at').default('CURRENT_TIMESTAMP')

      // 索引
      table.index('slot_slug')
      table.index('status')
      table.index(['slot_slug', 'status'])
    })
  },

  async down() {
    await Schema.dropIfExists('advertisements')
  },
}
