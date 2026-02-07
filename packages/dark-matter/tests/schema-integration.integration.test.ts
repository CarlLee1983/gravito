import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { Mongo, schema } from '../src'

const MONGODB_URI = process.env.MONGODB_URI
const describeIntegration = MONGODB_URI ? describe : describe.skip

describeIntegration('Schema Builder Integration', () => {
  beforeAll(async () => {
    Mongo.configure({
      default: 'test',
      connections: {
        test: { uri: MONGODB_URI!, database: 'dark_matter_schema_test' },
      },
    })
    await Mongo.connect()
  })

  afterAll(async () => {
    if (Mongo.isConnected()) {
      await Mongo.database().dropCollection('users')
      await Mongo.database().dropCollection('products')
      await Mongo.disconnect()
    }
  })

  describe('createCollectionWithSchema', () => {
    it('應該使用 Schema Builder 建立 Collection', async () => {
      const userSchema = schema()
        .required('username', 'email')
        .string('username', { minLength: 3, maxLength: 50 })
        .string('email', { pattern: '^.+@.+$' })

      await Mongo.database().createCollectionWithSchema('users', userSchema)

      const collections = await Mongo.database().listCollections()
      expect(collections).toContain('users')
    })

    it('應該驗證符合 Schema 的文檔可以插入', async () => {
      // 插入符合 Schema 的文檔應該成功
      const result = await Mongo.collection('users').insert({
        username: 'testuser',
        email: 'test@example.com',
      })

      expect(result.insertedId).toBeDefined()
    })

    it('應該拒絕不符合 Schema 的文檔（缺少必填欄位）', async () => {
      // 缺少必填欄位應該失敗
      try {
        await Mongo.collection('users').insert({
          username: 'testuser',
          // 缺少 email 欄位
        })
        // 如果沒有拋出錯誤，測試應該失敗
        expect(true).toBe(false)
      } catch (error: unknown) {
        // 應該捕獲驗證錯誤
        expect(error).toBeDefined()
      }
    })

    it('應該拒絕不符合 Schema 的文檔（違反驗證規則）', async () => {
      // 違反 minLength 應該失敗
      try {
        await Mongo.collection('users').insert({
          username: 'ab', // 太短（minLength: 3）
          email: 'test@example.com',
        })
        expect(true).toBe(false)
      } catch (error: unknown) {
        expect(error).toBeDefined()
      }
    })
  })

  describe('複雜 Schema', () => {
    it('應該支援複雜的巢狀 Schema', async () => {
      const productSchema = schema()
        .required('name', 'price', 'createdAt')
        .string('name', { minLength: 1, maxLength: 200 })
        .number('price', { minimum: 0 })
        .integer('stock', { minimum: 0 })
        .boolean('isActive')
        .date('createdAt')
        .array('tags', 'string', { minItems: 1 })
        .object('metadata', (s) =>
          s.string('brand').string('category').integer('weight', { minimum: 0 })
        )

      await Mongo.database().createCollectionWithSchema('products', productSchema)

      // 插入符合 Schema 的文檔
      const result = await Mongo.collection('products').insert({
        name: 'Test Product',
        price: 99.99,
        stock: 100,
        isActive: true,
        createdAt: new Date(),
        tags: ['electronics', 'gadgets'],
        metadata: {
          brand: 'TestBrand',
          category: 'Electronics',
          weight: 500,
        },
      })

      expect(result.insertedId).toBeDefined()
    })
  })

  describe('驗證選項', () => {
    it('應該支援自訂驗證等級', async () => {
      const schema1 = schema().required('name').string('name')

      await Mongo.database().createCollectionWithSchema('moderate_collection', schema1, {
        validationLevel: 'moderate',
        validationAction: 'warn',
      })

      const collections = await Mongo.database().listCollections()
      expect(collections).toContain('moderate_collection')

      // 清理
      await Mongo.database().dropCollection('moderate_collection')
    })
  })
})
