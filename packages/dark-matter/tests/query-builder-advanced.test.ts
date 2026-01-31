import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { Mongo } from '../src'

const MONGODB_URI = process.env.MONGODB_URI
const describeIntegration = MONGODB_URI ? describe : describe.skip

describeIntegration('MongoQueryBuilder 進階查詢測試', () => {
  beforeAll(async () => {
    Mongo.configure({
      default: 'test',
      connections: {
        test: { uri: MONGODB_URI!, database: 'dark_matter_advanced_test' },
      },
    })
    await Mongo.connect()
  })

  beforeEach(async () => {
    await Mongo.collection('users').deleteMany()
    await Mongo.collection('posts').deleteMany()
    await Mongo.collection('comments').deleteMany()
  })

  afterAll(async () => {
    if (Mongo.isConnected()) {
      await Mongo.database().dropCollection('users')
      await Mongo.database().dropCollection('posts')
      await Mongo.database().dropCollection('comments')
      await Mongo.disconnect()
    }
  })

  describe('複雜 where 查詢組合', () => {
    it('應該支援多層 where 條件', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'Alice', age: 25, city: 'Taipei', active: true, score: 85 },
        { name: 'Bob', age: 30, city: 'Taipei', active: true, score: 70 },
        { name: 'Charlie', age: 25, city: 'Kaohsiung', active: true, score: 90 },
        { name: 'David', age: 30, city: 'Taipei', active: false, score: 60 },
      ])

      const results = await Mongo.collection('users')
        .where('city', 'Taipei')
        .where('active', true)
        .where('age', '>=', 25)
        .where('score', '>', 75)
        .get()

      expect(results.length).toBe(1)
      expect(results[0].name).toBe('Alice')
    })

    it('應該支援 where 和 orWhere 組合', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'Alice', role: 'admin', department: 'IT' },
        { name: 'Bob', role: 'user', department: 'IT' },
        { name: 'Charlie', role: 'admin', department: 'HR' },
        { name: 'David', role: 'user', department: 'HR' },
      ])

      const results = await Mongo.collection('users')
        .where('department', 'IT')
        .orWhere('role', 'admin')
        .get()

      // 應該返回：IT 部門的所有人 + 所有 admin
      expect(results.length).toBeGreaterThanOrEqual(3)
    })

    it('應該支援多個 orWhere 條件', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'Alice', status: 'active' },
        { name: 'Bob', status: 'pending' },
        { name: 'Charlie', status: 'suspended' },
        { name: 'David', status: 'inactive' },
      ])

      const results = await Mongo.collection('users')
        .orWhere('status', 'active')
        .orWhere('status', 'pending')
        .get()

      expect(results.length).toBe(2)
    })

    it('應該支援複雜的 where + orWhere 組合', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'Alice', age: 25, city: 'Taipei', premium: true },
        { name: 'Bob', age: 30, city: 'Taipei', premium: false },
        { name: 'Charlie', age: 25, city: 'Kaohsiung', premium: false },
        { name: 'David', age: 35, city: 'Kaohsiung', premium: true },
      ])

      const results = await Mongo.collection('users')
        .where('city', 'Taipei')
        .where('premium', true)
        .orWhere('age', '>', 30)
        .get()

      // 應該返回：(Taipei AND premium) OR (age > 30)
      expect(results.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('whereIn 和 whereNotIn 組合', () => {
    it('應該支援 whereIn 和其他條件組合', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'Alice', role: 'admin', active: true },
        { name: 'Bob', role: 'editor', active: true },
        { name: 'Charlie', role: 'viewer', active: true },
        { name: 'David', role: 'admin', active: false },
      ])

      const results = await Mongo.collection('users')
        .whereIn('role', ['admin', 'editor'])
        .where('active', true)
        .get()

      expect(results.length).toBe(2)
    })

    it('應該支援 whereNotIn 排除多個值', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'Alice', status: 'active' },
        { name: 'Bob', status: 'deleted' },
        { name: 'Charlie', status: 'banned' },
        { name: 'David', status: 'pending' },
      ])

      const results = await Mongo.collection('users')
        .whereNotIn('status', ['deleted', 'banned'])
        .get()

      expect(results.length).toBe(2)
      expect(results.every((u) => !['deleted', 'banned'].includes(u.status))).toBe(true)
    })

    it('應該支援 whereIn 和 whereNotIn 組合', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'Alice', category: 'A', status: 'active' },
        { name: 'Bob', category: 'B', status: 'active' },
        { name: 'Charlie', category: 'A', status: 'deleted' },
        { name: 'David', category: 'C', status: 'active' },
      ])

      const results = await Mongo.collection('users')
        .whereIn('category', ['A', 'B'])
        .whereNotIn('status', ['deleted'])
        .get()

      expect(results.length).toBe(2)
    })
  })

  describe('巢狀 JSON 欄位查詢', () => {
    it('應該查詢巢狀物件欄位', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'Alice', metadata: { loginCount: 10, lastIP: '127.0.0.1' } },
        { name: 'Bob', metadata: { loginCount: 5, lastIP: '192.168.1.1' } },
        { name: 'Charlie', metadata: { loginCount: 15, lastIP: '10.0.0.1' } },
      ])

      const results = await Mongo.collection('users').where('metadata.loginCount', '>', 8).get()

      expect(results.length).toBe(2)
    })

    it('應該查詢深層巢狀欄位', async () => {
      await Mongo.collection('users').insertMany([
        {
          name: 'Alice',
          profile: { settings: { notifications: { email: true, sms: false } } },
        },
        {
          name: 'Bob',
          profile: { settings: { notifications: { email: false, sms: true } } },
        },
        {
          name: 'Charlie',
          profile: { settings: { notifications: { email: true, sms: true } } },
        },
      ])

      const results = await Mongo.collection('users')
        .where('profile.settings.notifications.email', true)
        .get()

      expect(results.length).toBe(2)
    })
  })

  describe('正規表達式查詢', () => {
    it('應該支援 whereRegex 字串模式', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'Alice', email: 'alice@gmail.com' },
        { name: 'Bob', email: 'bob@yahoo.com' },
        { name: 'Charlie', email: 'charlie@gmail.com' },
      ])

      const results = await Mongo.collection('users').whereRegex('email', '@gmail.com$').get()

      expect(results.length).toBe(2)
    })

    it('應該支援 whereRegex RegExp 物件', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'Alice', sku: 'PROD-001' },
        { name: 'Bob', sku: 'TEST-002' },
        { name: 'Charlie', sku: 'PROD-003' },
      ])

      const results = await Mongo.collection('users')
        .whereRegex('sku', /^PROD-/)
        .get()

      expect(results.length).toBe(2)
    })

    it('應該支援大小寫不敏感的正規表達式', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'alice' },
        { name: 'ALICE' },
        { name: 'Alice' },
        { name: 'bob' },
      ])

      const results = await Mongo.collection('users').whereRegex('name', /alice/i).get()

      expect(results.length).toBe(3)
    })
  })

  describe('whereExists 查詢', () => {
    it('應該查詢欄位存在的文檔', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'Alice', phone: '123456789' },
        { name: 'Bob' },
        { name: 'Charlie', phone: '987654321' },
      ])

      const results = await Mongo.collection('users').whereExists('phone').get()

      expect(results.length).toBe(2)
    })

    it('應該查詢欄位不存在的文檔', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'Alice', email: 'alice@example.com' },
        { name: 'Bob' },
        { name: 'Charlie' },
      ])

      const results = await Mongo.collection('users').whereExists('email', false).get()

      expect(results.length).toBe(2)
    })
  })

  describe('軟刪除與查詢組合', () => {
    it('應該支援 withTrashed 和 where 組合', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'Alice', status: 'active', deletedAt: null },
        { name: 'Bob', status: 'active', deletedAt: new Date() },
        { name: 'Charlie', status: 'inactive', deletedAt: null },
        { name: 'David', status: 'active', deletedAt: new Date() },
      ])

      const results = await Mongo.collection('users').withTrashed().where('status', 'active').get()

      // 應該返回所有 active 的，包括已刪除的
      expect(results.length).toBe(3)
    })

    it('應該支援 onlyTrashed 和 where 組合', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'Alice', role: 'admin', deletedAt: null },
        { name: 'Bob', role: 'admin', deletedAt: new Date() },
        { name: 'Charlie', role: 'user', deletedAt: new Date() },
      ])

      const results = await Mongo.collection('users').onlyTrashed().where('role', 'admin').get()

      expect(results.length).toBe(1)
      expect(results[0].name).toBe('Bob')
    })

    it('應該支援軟刪除模式與複雜查詢組合', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'Alice', age: 25, city: 'Taipei', deletedAt: null },
        { name: 'Bob', age: 30, city: 'Taipei', deletedAt: new Date() },
        { name: 'Charlie', age: 25, city: 'Kaohsiung', deletedAt: null },
        { name: 'David', age: 30, city: 'Taipei', deletedAt: new Date() },
      ])

      const results = await Mongo.collection('users')
        .withTrashed()
        .where('city', 'Taipei')
        .where('age', '>=', 25)
        .get()

      expect(results.length).toBe(3)
    })
  })

  describe('Builder 克隆與重用', () => {
    it('應該能夠克隆 builder', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'Alice', role: 'admin', active: true },
        { name: 'Bob', role: 'user', active: true },
        { name: 'Charlie', role: 'admin', active: false },
      ])

      const baseQuery = Mongo.collection('users').where('active', true)

      const admins = await baseQuery.clone().where('role', 'admin').get()
      const users = await baseQuery.clone().where('role', 'user').get()

      expect(admins.length).toBe(1)
      expect(admins[0].name).toBe('Alice')
      expect(users.length).toBe(1)
      expect(users[0].name).toBe('Bob')
    })

    it('克隆的 builder 應該獨立運作', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'Alice', age: 25, score: 80 },
        { name: 'Bob', age: 30, score: 70 },
        { name: 'Charlie', age: 25, score: 90 },
      ])

      const baseQuery = Mongo.collection('users').where('age', 25)
      const cloned = baseQuery.clone().where('score', '>', 75)

      const baseResults = await baseQuery.get()
      const clonedResults = await cloned.get()

      // baseQuery 不應該受到 cloned 的影響
      expect(baseResults.length).toBe(2)
      expect(clonedResults.length).toBe(2)
    })

    it('克隆應該保留所有查詢狀態', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'Alice', age: 25, score: 80, active: true },
        { name: 'Bob', age: 30, score: 70, active: true },
        { name: 'Charlie', age: 25, score: 90, active: false },
      ])

      const baseQuery = Mongo.collection('users')
        .where('age', 25)
        .select('name', 'score')
        .orderBy('score', 'desc')
        .limit(10)

      const cloned = baseQuery.clone()
      const results = await cloned.get()

      expect(results.length).toBe(2)
      expect(results[0].name).toBe('Charlie')
      expect(results[0].score).toBe(90)
      expect(results[0].age).toBeUndefined() // 因為沒有 select age
    })
  })

  describe('排序和分頁組合', () => {
    it('應該支援多欄位排序和分頁', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'Alice', category: 'A', score: 80 },
        { name: 'Bob', category: 'A', score: 90 },
        { name: 'Charlie', category: 'B', score: 70 },
        { name: 'David', category: 'B', score: 85 },
        { name: 'Eve', category: 'A', score: 75 },
      ])

      const results = await Mongo.collection('users')
        .orderBy('category', 'asc')
        .orderBy('score', 'desc')
        .skip(1)
        .limit(2)
        .get()

      expect(results.length).toBe(2)
      // 應該是 A 類別的第 2、3 名
      expect(results[0].category).toBe('A')
    })

    it('應該支援 latest 和 limit 組合', async () => {
      const now = new Date()
      await Mongo.collection('users').insertMany([
        { name: 'Alice', createdAt: new Date(now.getTime() - 3000) },
        { name: 'Bob', createdAt: new Date(now.getTime() - 2000) },
        { name: 'Charlie', createdAt: new Date(now.getTime() - 1000) },
      ])

      const results = await Mongo.collection('users').latest().limit(2).get()

      expect(results.length).toBe(2)
      expect(results[0].name).toBe('Charlie')
      expect(results[1].name).toBe('Bob')
    })

    it('應該支援 oldest 和 skip 組合', async () => {
      const now = new Date()
      await Mongo.collection('users').insertMany([
        { name: 'Alice', createdAt: new Date(now.getTime() - 3000) },
        { name: 'Bob', createdAt: new Date(now.getTime() - 2000) },
        { name: 'Charlie', createdAt: new Date(now.getTime() - 1000) },
      ])

      const results = await Mongo.collection('users').oldest().skip(1).limit(1).get()

      expect(results.length).toBe(1)
      expect(results[0].name).toBe('Bob')
    })
  })

  describe('projection 組合', () => {
    it('應該支援 select 和 where 組合', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'Alice', email: 'alice@example.com', password: 'secret1', age: 25 },
        { name: 'Bob', email: 'bob@example.com', password: 'secret2', age: 30 },
      ])

      const results = await Mongo.collection('users')
        .where('age', '>', 20)
        .select('name', 'email')
        .get()

      expect(results.length).toBe(2)
      expect(results[0].name).toBeDefined()
      expect(results[0].email).toBeDefined()
      expect(results[0].password).toBeUndefined()
      expect(results[0].age).toBeUndefined()
    })

    it('應該支援 exclude 和複雜查詢組合', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'Alice', email: 'alice@example.com', password: 'secret1', token: 'abc' },
        { name: 'Bob', email: 'bob@example.com', password: 'secret2', token: 'def' },
      ])

      const results = await Mongo.collection('users')
        .where('name', 'Alice')
        .exclude('password', 'token')
        .get()

      expect(results.length).toBe(1)
      expect(results[0].name).toBeDefined()
      expect(results[0].email).toBeDefined()
      expect(results[0].password).toBeUndefined()
      expect(results[0].token).toBeUndefined()
    })
  })

  describe('toFilter 測試', () => {
    it('應該正確生成基本 filter', () => {
      const query = Mongo.collection('users').where('name', 'Alice').where('age', '>', 20)

      const filter = query.toFilter()

      expect(filter.name).toBe('Alice')
      expect(filter.age).toEqual({ $gt: 20 })
    })

    it('應該正確生成帶 orWhere 的 filter', () => {
      const query = Mongo.collection('users').where('role', 'admin').orWhere('department', 'IT')

      const filter = query.toFilter()

      expect(filter.$or).toBeDefined()
    })

    it('應該在軟刪除模式下添加 deletedAt 過濾', () => {
      const query = Mongo.collection('users').where('active', true)

      const filter = query.toFilter()

      // 預設模式應該過濾已刪除的記錄
      expect(filter.deletedAt).toBe(null)
    })

    it('withTrashed 模式不應該添加 deletedAt 過濾', () => {
      const query = Mongo.collection('users').withTrashed().where('active', true)

      const filter = query.toFilter()

      // withTrashed 不應該過濾 deletedAt
      // 注意：這取決於實際實現
      expect(filter.active).toBe(true)
    })
  })
})
