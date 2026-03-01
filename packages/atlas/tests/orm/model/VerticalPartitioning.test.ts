import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { DB } from '../../../src/DB'
import { column, deferred, Model } from '../../../src/orm/model'
import { Schema } from '../../../src/schema/Schema'

describe('Vertical Partitioning Automation', () => {
  beforeAll(async () => {
    DB.addConnection('default', {
      driver: 'sqlite',
      database: ':memory:',
    })

    // Create main and extension tables
    await Schema.create('products', (table) => {
      table.id()
      table.string('name')
      table.timestamps()
    })

    await Schema.create('product_details', (table) => {
      table.integer('id').primary()
      table.text('description')
      table.json('metadata').nullable()
    })
  })

  afterAll(async () => {
    await DB.disconnectAll()
  })

  class Product extends Model {
    static table = 'products'
    static extensionTable = 'product_details'
    static casts = {
      metadata: 'json',
    }

    @column({ isPrimary: true })
    declare id: number

    @column()
    declare name: string

    @deferred()
    declare description: string

    @deferred()
    declare metadata: any
  }

  it('should automatically split data during save()', async () => {
    const product = Product.make()
    product.name = 'iPhone 17'
    product.description = 'The best iPhone ever'
    product.metadata = { color: 'Titanium' }

    await product.save()

    expect(product.id).toBeDefined()

    // Verify data in main table
    const mainRow = await DB.table('products').where('id', product.id).first()
    expect(mainRow.name).toBe('iPhone 17')
    expect(mainRow.description).toBeUndefined()

    // Verify data in extension table
    const extendedRow = await DB.table('product_details').where('id', product.id).first()
    expect(extendedRow.description).toBe('The best iPhone ever')
    expect(JSON.parse(extendedRow.metadata).color).toBe('Titanium')
  })

  it('should exclude deferred columns by default in queries', async () => {
    const products = await Product.query().get()
    expect(products.length).toBeGreaterThan(0)

    // Check first item
    const p = products[0]
    expect(p.name).toBe('iPhone 17')

    // In our implementation, deferred columns are NOT in _attributes
    expect((p as any)._attributes.description).toBeUndefined()
  })

  it('should include deferred columns when using withDeferred()', async () => {
    const products = await Product.query().withDeferred().get()
    expect(products.length).toBeGreaterThan(0)

    const p = products[0]
    expect(p.name).toBe('iPhone 17')
    expect(p.description).toBe('The best iPhone ever')
    expect(p.metadata.color).toBe('Titanium')
  })

  it('should handle updates across both tables', async () => {
    const product = (await Product.query().first()) as Product
    product.name = 'iPhone 17 Pro'
    product.description = 'Updated description'

    await product.save()

    // Verify both
    const mainRow = await DB.table('products').where('id', product.id).first()
    expect(mainRow.name).toBe('iPhone 17 Pro')

    const extendedRow = await DB.table('product_details').where('id', product.id).first()
    expect(extendedRow.description).toBe('Updated description')
  })

  it('should delete from both tables', async () => {
    const product = (await Product.query().first()) as Product
    const id = product.id

    await product.delete()

    const mainRow = await DB.table('products').where('id', id).first()
    expect(mainRow).toBeNull()

    const extendedRow = await DB.table('product_details').where('id', id).first()
    expect(extendedRow).toBeNull()
  })
})
