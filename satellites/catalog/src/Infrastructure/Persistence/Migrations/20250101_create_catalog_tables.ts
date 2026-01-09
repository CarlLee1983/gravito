import { type Blueprint, Schema } from '@gravito/atlas'

/**
 * Migration to create Catalog tables: categories, products, and variants.
 */
export default {
  async up() {
    // 1. Categories Table (Nested Set / Path Pattern)
    await Schema.create('categories', (table: Blueprint) => {
      table.string('id').primary()
      table.string('parent_id').nullable()
      table.string('path').nullable() // e.g., "electronics/computers/laptops"
      table.string('name') // Unified i18n JSON
      table.string('slug').unique()
      table.text('description').nullable()
      table.integer('sort_order').default(0)
      table.timestamp('created_at').default('CURRENT_TIMESTAMP')
      table.timestamp('updated_at').nullable()
      table.text('metadata').nullable()
    })

    // 2. Products Table
    await Schema.create('products', (table: Blueprint) => {
      table.string('id').primary()
      table.string('name')
      table.string('slug').unique()
      table.text('description').nullable()
      table.string('brand').nullable()
      table.string('status').default('active') // active, draft, archived
      table.string('thumbnail').nullable()
      table.timestamp('created_at').default('CURRENT_TIMESTAMP')
      table.timestamp('updated_at').nullable()
      table.text('metadata').nullable()
    })

    // 3. Product Variants (SKUs)
    await Schema.create('product_variants', (table: Blueprint) => {
      table.string('id').primary()
      table.string('product_id')
      table.string('sku').unique()
      table.string('name').nullable() // Optional variant specific name
      table.decimal('price', 15, 2)
      table.decimal('compare_at_price', 15, 2).nullable() // Original price for sales
      table.integer('stock').default(0)
      table.text('options').nullable() // e.g., {"color": "Blue", "size": "XL"}
      table.timestamp('created_at').default('CURRENT_TIMESTAMP')
      table.timestamp('updated_at').nullable()
      table.text('metadata').nullable()
    })

    // 4. Pivot Table: Product belongs to many Categories
    await Schema.create('category_product', (table: Blueprint) => {
      table.string('category_id').primary()
      table.string('product_id').primary()
    })
  },

  async down() {
    await Schema.dropIfExists('category_product')
    await Schema.dropIfExists('product_variants')
    await Schema.dropIfExists('products')
    await Schema.dropIfExists('categories')
  },
}
