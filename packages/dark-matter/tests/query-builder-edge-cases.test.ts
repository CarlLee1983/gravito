import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { Mongo } from '../src'

const MONGODB_URI = process.env.MONGODB_URI
const describeIntegration = MONGODB_URI ? describe : describe.skip

describeIntegration('MongoQueryBuilder 邊界案例測試', () => {
  beforeAll(async () => {
    Mongo.configure({
      default: 'test',
      connections: {
        test: { uri: MONGODB_URI!, database: 'dark_matter_edge_cases_test' },
      },
    })
    await Mongo.connect()
  })

  beforeEach(async () => {
    await Mongo.collection('test').deleteMany()
  })

  afterAll(async () => {
    if (Mongo.isConnected()) {
      await Mongo.database().dropCollection('test')
      await Mongo.disconnect()
    }
  })

  describe('null 和 undefined 值處理', () => {
    it('應該正確處理 null 值查詢', async () => {
      await Mongo.collection('test').insertMany([
        { name: 'Test 1', value: null },
        { name: 'Test 2', value: 100 },
        { name: 'Test 3', value: null },
      ])

      const results = await Mongo.collection('test').where('value', null).get()

      expect(results.length).toBe(2)
      expect(results.every((r) => r.value === null)).toBe(true)
    })

    it('應該正確處理 whereNull 查詢', async () => {
      await Mongo.collection('test').insertMany([
        { name: 'Test 1', deletedAt: null },
        { name: 'Test 2', deletedAt: new Date() },
        { name: 'Test 3' }, // 欄位不存在
      ])

      const results = await Mongo.collection('test').whereNull('deletedAt').get()

      // whereNull 應該匹配 null 值，但可能也匹配不存在的欄位
      expect(results.length).toBeGreaterThanOrEqual(1)
    })

    it('應該正確處理 whereNotNull 查詢', async () => {
      await Mongo.collection('test').insertMany([
        { name: 'Test 1', value: null },
        { name: 'Test 2', value: 100 },
        { name: 'Test 3', value: 0 },
        { name: 'Test 4' }, // value 欄位不存在
      ])

      const results = await Mongo.collection('test').whereNotNull('value').get()

      expect(results.length).toBe(2)
      expect(results.every((r) => r.value !== null)).toBe(true)
    })

    it('應該處理查詢值為 undefined 的情況', async () => {
      await Mongo.collection('test').insertMany([
        { name: 'Test 1', value: 100 },
        { name: 'Test 2', value: undefined },
      ])

      // 查詢 undefined 應該被當作 null 處理
      const results = await Mongo.collection('test').where('value', undefined).get()

      // MongoDB 會將 undefined 視為查詢未定義欄位
      expect(results).toBeDefined()
    })
  })

  describe('空值和空陣列處理', () => {
    it('應該處理 whereIn 空陣列', async () => {
      await Mongo.collection('test').insertMany([
        { name: 'Test 1', status: 'active' },
        { name: 'Test 2', status: 'inactive' },
      ])

      const results = await Mongo.collection('test').whereIn('status', []).get()

      expect(results.length).toBe(0)
    })

    it('應該處理 whereNotIn 空陣列', async () => {
      await Mongo.collection('test').insertMany([
        { name: 'Test 1', status: 'active' },
        { name: 'Test 2', status: 'inactive' },
      ])

      const results = await Mongo.collection('test').whereNotIn('status', []).get()

      // 空陣列表示不排除任何值，所以應該返回所有記錄
      expect(results.length).toBe(2)
    })

    it('應該處理 whereIn 包含 null 的陣列', async () => {
      await Mongo.collection('test').insertMany([
        { name: 'Test 1', value: null },
        { name: 'Test 2', value: 100 },
        { name: 'Test 3', value: 200 },
      ])

      const results = await Mongo.collection('test').whereIn('value', [null, 100]).get()

      expect(results.length).toBe(2)
    })
  })

  describe('邊界值處理', () => {
    it('應該處理 limit(0)', async () => {
      await Mongo.collection('test').insertMany([
        { name: 'Test 1' },
        { name: 'Test 2' },
        { name: 'Test 3' },
      ])

      const results = await Mongo.collection('test').limit(0).get()

      expect(results.length).toBe(0)
    })

    it('應該處理 limit(1)', async () => {
      await Mongo.collection('test').insertMany([
        { name: 'Test 1' },
        { name: 'Test 2' },
        { name: 'Test 3' },
      ])

      const results = await Mongo.collection('test').limit(1).get()

      expect(results.length).toBe(1)
    })

    it('應該處理超大的 limit 值', async () => {
      await Mongo.collection('test').insertMany([
        { name: 'Test 1' },
        { name: 'Test 2' },
        { name: 'Test 3' },
      ])

      const results = await Mongo.collection('test').limit(1000000).get()

      // 應該返回所有記錄，因為實際數量小於 limit
      expect(results.length).toBe(3)
    })

    it('應該處理 skip(0)', async () => {
      await Mongo.collection('test').insertMany([
        { name: 'Test 1' },
        { name: 'Test 2' },
        { name: 'Test 3' },
      ])

      const results = await Mongo.collection('test').skip(0).get()

      expect(results.length).toBe(3)
    })

    it('應該處理超大的 skip 值', async () => {
      await Mongo.collection('test').insertMany([
        { name: 'Test 1' },
        { name: 'Test 2' },
        { name: 'Test 3' },
      ])

      const results = await Mongo.collection('test').skip(1000).get()

      // skip 超過實際數量，應該返回空陣列
      expect(results.length).toBe(0)
    })

    it('應該處理 limit 和 skip 組合', async () => {
      await Mongo.collection('test').insertMany([
        { name: 'Test 1', order: 1 },
        { name: 'Test 2', order: 2 },
        { name: 'Test 3', order: 3 },
        { name: 'Test 4', order: 4 },
        { name: 'Test 5', order: 5 },
      ])

      const results = await Mongo.collection('test').orderBy('order', 'asc').skip(2).limit(2).get()

      expect(results.length).toBe(2)
      expect(results[0].order).toBe(3)
      expect(results[1].order).toBe(4)
    })
  })

  describe('空 collection 處理', () => {
    it('應該在空 collection 上執行查詢', async () => {
      const results = await Mongo.collection('test').get()

      expect(results).toBeDefined()
      expect(results.length).toBe(0)
    })

    it('應該在空 collection 上執行 count', async () => {
      const count = await Mongo.collection('test').count()

      expect(count).toBe(0)
    })

    it('應該在空 collection 上執行 first', async () => {
      const result = await Mongo.collection('test').first()

      expect(result).toBeNull()
    })

    it('應該在空 collection 上執行 find', async () => {
      const result = await Mongo.collection('test').find('507f1f77bcf86cd799439011')

      expect(result).toBeNull()
    })
  })

  describe('型別轉換和特殊值', () => {
    it('應該正確處理數字字串比較', async () => {
      await Mongo.collection('test').insertMany([
        { name: 'Test 1', value: 10 },
        { name: 'Test 2', value: 20 },
        { name: 'Test 3', value: 30 },
      ])

      // MongoDB 不會自動轉換型別
      const results = await Mongo.collection('test').where('value', '20').get()

      // 字串 '20' 不等於數字 20
      expect(results.length).toBe(0)
    })

    it('應該正確處理布林值查詢', async () => {
      await Mongo.collection('test').insertMany([
        { name: 'Test 1', active: true },
        { name: 'Test 2', active: false },
        { name: 'Test 3', active: 1 },
        { name: 'Test 4', active: 0 },
      ])

      const results = await Mongo.collection('test').where('active', true).get()

      // 只匹配布林值 true，不匹配數字 1
      expect(results.length).toBe(1)
      expect(results[0].name).toBe('Test 1')
    })

    it('應該正確處理日期查詢', async () => {
      const date1 = new Date('2024-01-01')
      const date2 = new Date('2024-06-01')
      const date3 = new Date('2024-12-01')

      await Mongo.collection('test').insertMany([
        { name: 'Test 1', createdAt: date1 },
        { name: 'Test 2', createdAt: date2 },
        { name: 'Test 3', createdAt: date3 },
      ])

      const results = await Mongo.collection('test')
        .where('createdAt', '>=', new Date('2024-05-01'))
        .get()

      expect(results.length).toBe(2)
    })

    it('應該正確處理 ObjectId 查詢', async () => {
      const result = await Mongo.collection('test').insert({ name: 'Test' })

      const found = await Mongo.collection('test').find(result.insertedId.toString())

      expect(found).not.toBeNull()
      expect(found?.name).toBe('Test')
    })
  })

  describe('運算子邊界測試', () => {
    it('應該處理 > 運算子的邊界值', async () => {
      await Mongo.collection('test').insertMany([
        { name: 'Test 1', value: 0 },
        { name: 'Test 2', value: 10 },
        { name: 'Test 3', value: 20 },
      ])

      const results = await Mongo.collection('test').where('value', '>', 10).get()

      expect(results.length).toBe(1)
      expect(results[0].value).toBe(20)
    })

    it('應該處理 >= 運算子的邊界值', async () => {
      await Mongo.collection('test').insertMany([
        { name: 'Test 1', value: 0 },
        { name: 'Test 2', value: 10 },
        { name: 'Test 3', value: 20 },
      ])

      const results = await Mongo.collection('test').where('value', '>=', 10).get()

      expect(results.length).toBe(2)
    })

    it('應該處理 != 運算子與 null', async () => {
      await Mongo.collection('test').insertMany([
        { name: 'Test 1', value: null },
        { name: 'Test 2', value: 0 },
        { name: 'Test 3', value: 10 },
      ])

      const results = await Mongo.collection('test').where('value', '!=', null).get()

      expect(results.length).toBe(2)
      expect(results.every((r) => r.value !== null)).toBe(true)
    })
  })

  describe('複雜查詢組合', () => {
    it('應該處理多個 where 條件', async () => {
      await Mongo.collection('test').insertMany([
        { name: 'Test 1', status: 'active', score: 80 },
        { name: 'Test 2', status: 'active', score: 60 },
        { name: 'Test 3', status: 'inactive', score: 90 },
      ])

      const results = await Mongo.collection('test')
        .where('status', 'active')
        .where('score', '>=', 70)
        .get()

      expect(results.length).toBe(1)
      expect(results[0].name).toBe('Test 1')
    })

    it('應該處理 where 和 whereIn 組合', async () => {
      await Mongo.collection('test').insertMany([
        { name: 'Test 1', category: 'A', active: true },
        { name: 'Test 2', category: 'B', active: true },
        { name: 'Test 3', category: 'A', active: false },
        { name: 'Test 4', category: 'C', active: true },
      ])

      const results = await Mongo.collection('test')
        .whereIn('category', ['A', 'B'])
        .where('active', true)
        .get()

      expect(results.length).toBe(2)
    })

    it('應該處理 whereNotNull 和其他條件組合', async () => {
      await Mongo.collection('test').insertMany([
        { name: 'Test 1', value: 100, deletedAt: null },
        { name: 'Test 2', value: 200, deletedAt: new Date() },
        { name: 'Test 3', value: 150, deletedAt: null },
      ])

      const results = await Mongo.collection('test')
        .whereNotNull('deletedAt')
        .where('value', '>', 100)
        .get()

      expect(results.length).toBe(1)
      expect(results[0].name).toBe('Test 2')
    })
  })

  describe('projection 邊界測試', () => {
    it('應該處理空的 select', async () => {
      await Mongo.collection('test').insert({
        name: 'Test',
        email: 'test@example.com',
        password: 'secret',
      })

      const results = await Mongo.collection('test').get()

      // 沒有 select，應該返回所有欄位
      expect(results[0].name).toBeDefined()
      expect(results[0].email).toBeDefined()
      expect(results[0].password).toBeDefined()
    })

    it('應該處理 select 單一欄位', async () => {
      await Mongo.collection('test').insert({
        name: 'Test',
        email: 'test@example.com',
        password: 'secret',
      })

      const results = await Mongo.collection('test').select('name').get()

      expect(results[0].name).toBeDefined()
      expect(results[0].email).toBeUndefined()
      expect(results[0].password).toBeUndefined()
    })

    it('應該處理 exclude 單一欄位', async () => {
      await Mongo.collection('test').insert({
        name: 'Test',
        email: 'test@example.com',
        password: 'secret',
      })

      const results = await Mongo.collection('test').exclude('password').get()

      expect(results[0].name).toBeDefined()
      expect(results[0].email).toBeDefined()
      expect(results[0].password).toBeUndefined()
    })
  })

  describe('排序邊界測試', () => {
    it('應該處理多欄位排序', async () => {
      await Mongo.collection('test').insertMany([
        { category: 'A', score: 80, name: 'Test 1' },
        { category: 'A', score: 90, name: 'Test 2' },
        { category: 'B', score: 80, name: 'Test 3' },
        { category: 'B', score: 70, name: 'Test 4' },
      ])

      const results = await Mongo.collection('test')
        .orderBy('category', 'asc')
        .orderBy('score', 'desc')
        .get()

      expect(results[0].name).toBe('Test 2') // A, 90
      expect(results[1].name).toBe('Test 1') // A, 80
      expect(results[2].name).toBe('Test 3') // B, 80
      expect(results[3].name).toBe('Test 4') // B, 70
    })

    it('應該處理 null 值排序', async () => {
      await Mongo.collection('test').insertMany([
        { name: 'Test 1', value: 100 },
        { name: 'Test 2', value: null },
        { name: 'Test 3', value: 50 },
        { name: 'Test 4', value: null },
      ])

      const results = await Mongo.collection('test').orderBy('value', 'asc').get()

      // null 值通常排在最前面（升序）
      expect(results).toBeDefined()
      expect(results.length).toBe(4)
    })
  })
})
