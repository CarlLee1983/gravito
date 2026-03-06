import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { column, DB, deferred, Model, Schema } from '../../../src'

const VP_CONN = 'vp_test_conn'

class VPProduct extends Model {
  static table = 'vp_products'
  static connection = VP_CONN
  static extensionTable = 'vp_product_details'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare price: number

  @deferred({ table: 'vp_product_details' })
  declare description: string

  @deferred({ table: 'vp_product_details' })
  declare metadata: any
}

class VPProductExclude extends Model {
  static table = 'vp_products'
  static connection = VP_CONN
  static extensionTable = 'vp_product_details'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare price: number

  @deferred({ table: 'vp_product_details' })
  declare description: string
}

class VPProductInclude extends Model {
  static table = 'vp_products'
  static connection = VP_CONN
  static extensionTable = 'vp_product_details'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare price: number

  @deferred({ table: 'vp_product_details' })
  declare description: string
}

class VPProductUpdate extends Model {
  static table = 'vp_products'
  static connection = VP_CONN
  static extensionTable = 'vp_product_details'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare price: number

  @deferred({ table: 'vp_product_details' })
  declare description: string
}

class VPProductDelete extends Model {
  static table = 'vp_products'
  static connection = VP_CONN
  static extensionTable = 'vp_product_details'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare price: number

  @deferred({ table: 'vp_product_details' })
  declare description: string
}

describe('Vertical Partitioning Automation', () => {
  beforeAll(async () => {
    DB.addConnection(VP_CONN, {
      driver: 'sqlite',
      database: ':memory:',
    })

    // Create main and extension tables
    await Schema.connection(VP_CONN).create('vp_products', (table) => {
      table.id()
      table.string('name')
      table.decimal('price')
      table.timestamps()
    })

    await Schema.connection(VP_CONN).create('vp_product_details', (table) => {
      // Use 'id' as the link to match HasPersistence current behavior
      table.integer('id').unsigned().primary()
      table.text('description')
      table.json('metadata').nullable()
    })
  })

  afterAll(async () => {
    await DB.disconnect(VP_CONN)
  })

  it('should automatically split data during save()', async () => {
    const product = VPProduct.make()
    product.name = 'iPhone 15'
    product.price = 999
    product.description = 'The latest iPhone'
    product.metadata = { color: 'Titanium' }

    await product.save()

    expect(product.id).toBeDefined()

    // Verify main table
    const mainData = await DB.connection(VP_CONN)
      .table('vp_products')
      .where('id', product.id)
      .first()
    expect(mainData.name).toBe('iPhone 15')
    expect(mainData.description).toBeUndefined()

    // Verify extension table
    const extensionData = await DB.connection(VP_CONN)
      .table('vp_product_details')
      .where('id', product.id)
      .first()
    expect(extensionData.description).toBe('The latest iPhone')

    // Metadata is stringified in the DB for extension tables by HasPersistence
    const meta =
      typeof extensionData.metadata === 'string'
        ? JSON.parse(extensionData.metadata)
        : extensionData.metadata
    expect(meta).toEqual({ color: 'Titanium' })
  })

  it('should exclude deferred columns by default in queries', async () => {
    const p = VPProductExclude.make()
    p.name = 'Test'
    p.price = 100
    p.description = 'Large text'
    await p.save()

    const found = await VPProductExclude.find(p.id)
    expect(found?.name).toBe('Test')
    // @ts-expect-error
    expect(found?.description).toBeUndefined()
  })

  it('should include deferred columns when using withDeferred()', async () => {
    const p = VPProductInclude.make()
    p.name = 'Test'
    p.price = 100
    p.description = 'Large text'
    await p.save()

    // Qualify 'id' to avoid ambiguity when joined with extension table
    const found = await VPProductInclude.query()
      .withDeferred()
      .where('vp_products.id', p.id)
      .first()
    expect(found?.name).toBe('Test')
    expect(found?.description).toBe('Large text')
  })

  it('should handle updates across both tables', async () => {
    const p = VPProductUpdate.make()
    p.name = 'Old Name'
    p.price = 100
    p.description = 'Old Description'
    await p.save()

    p.name = 'New Name'
    p.description = 'New Description'
    await p.save()

    const main = await DB.connection(VP_CONN).table('vp_products').where('id', p.id).first()
    expect(main.name).toBe('New Name')

    const ext = await DB.connection(VP_CONN).table('vp_product_details').where('id', p.id).first()
    expect(ext.description).toBe('New Description')
  })

  it('should delete from both tables', async () => {
    const p = VPProductDelete.make()
    p.name = 'To Delete'
    p.price = 100
    p.description = 'To Delete'
    await p.save()

    await p.delete()

    const main = await DB.connection(VP_CONN).table('vp_products').where('id', p.id).first()
    expect(main).toBeNull()

    const ext = await DB.connection(VP_CONN).table('vp_product_details').where('id', p.id).first()
    expect(ext).toBeNull()
  })
})
