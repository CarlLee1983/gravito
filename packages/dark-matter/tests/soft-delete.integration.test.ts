import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { Mongo } from '../src'

const MONGODB_URI = process.env.MONGODB_URI
const describeIntegration = MONGODB_URI ? describe : describe.skip

describeIntegration('Soft Delete Feature', () => {
  beforeAll(async () => {
    Mongo.configure({
      default: 'test',
      connections: {
        test: { uri: MONGODB_URI!, database: 'dark_matter_soft_delete_test' },
      },
    })
    await Mongo.connect()
  })

  beforeEach(async () => {
    await Mongo.collection('users').deleteMany()
  })

  afterAll(async () => {
    if (Mongo.isConnected()) {
      await Mongo.database().dropCollection('users')
      await Mongo.disconnect()
    }
  })

  describe('基本軟刪除功能', () => {
    it('應該自動過濾已軟刪除的記錄', async () => {
      // 插入測試資料
      await Mongo.collection('users').insertMany([
        { name: 'Active User', status: 'active', deletedAt: null },
        { name: 'Deleted User', status: 'active', deletedAt: new Date() },
      ])

      // 查詢應該只返回未刪除的記錄
      const users = await Mongo.collection('users').get()
      expect(users.length).toBe(1)
      expect(users[0].name).toBe('Active User')
    })

    it('應該執行軟刪除操作', async () => {
      const result = await Mongo.collection('users').insert({
        name: 'Test User',
        email: 'test@example.com',
      })

      const deleteResult = await Mongo.collection('users')
        .where('_id', result.insertedId)
        .softDelete()

      expect(deleteResult.modifiedCount).toBe(1)

      // 驗證記錄被軟刪除
      const user = await Mongo.collection('users').withTrashed().find(result.insertedId)
      expect(user?.deletedAt).toBeDefined()
      expect(user?.deletedAt).toBeInstanceOf(Date)
    })

    it('withTrashed() 應該包含已刪除的記錄', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'Active User', deletedAt: null },
        { name: 'Deleted User', deletedAt: new Date() },
      ])

      const users = await Mongo.collection('users').withTrashed().get()
      expect(users.length).toBe(2)
    })

    it('onlyTrashed() 應該只返回已刪除的記錄', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'Active User', deletedAt: null },
        { name: 'Deleted User', deletedAt: new Date() },
      ])

      const users = await Mongo.collection('users').onlyTrashed().get()
      expect(users.length).toBe(1)
      expect(users[0].name).toBe('Deleted User')
    })

    it('restore() 應該恢復軟刪除的記錄', async () => {
      const result = await Mongo.collection('users').insert({
        name: 'Test User',
        deletedAt: new Date(),
      })

      await Mongo.collection('users').where('_id', result.insertedId).restore()

      const user = await Mongo.collection('users').find(result.insertedId)
      expect(user).not.toBeNull()
      expect(user?.deletedAt).toBeNull()
    })

    it('forceDelete() 應該永久刪除記錄', async () => {
      const result = await Mongo.collection('users').insert({
        name: 'Test User',
      })

      await Mongo.collection('users').where('_id', result.insertedId).forceDelete()

      const user = await Mongo.collection('users').withTrashed().find(result.insertedId)
      expect(user).toBeNull()
    })
  })

  describe('批次軟刪除', () => {
    it('softDeleteMany() 應該批次軟刪除', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'User 1', status: 'inactive' },
        { name: 'User 2', status: 'inactive' },
        { name: 'User 3', status: 'active' },
      ])

      const result = await Mongo.collection('users').where('status', 'inactive').softDeleteMany()

      expect(result.modifiedCount).toBe(2)

      const activeUsers = await Mongo.collection('users').get()
      expect(activeUsers.length).toBe(1)
    })

    it('restoreMany() 應該批次恢復', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'User 1', deletedAt: new Date() },
        { name: 'User 2', deletedAt: new Date() },
      ])

      const result = await Mongo.collection('users').onlyTrashed().restoreMany()

      expect(result.modifiedCount).toBe(2)

      const users = await Mongo.collection('users').get()
      expect(users.length).toBe(2)
    })
  })

  describe('向後相容性', () => {
    it('對於沒有 deletedAt 欄位的文檔應該正常運作', async () => {
      await Mongo.collection('legacy').insertMany([
        { name: 'Legacy User 1' },
        { name: 'Legacy User 2' },
      ])

      const users = await Mongo.collection('legacy').get()
      expect(users.length).toBe(2)
    })

    it('混合有無 deletedAt 欄位的文檔應該正確過濾', async () => {
      await Mongo.collection('mixed').insertMany([
        { name: 'No Field' }, // 沒有 deletedAt 欄位
        { name: 'Null Value', deletedAt: null }, // deletedAt 為 null
        { name: 'Deleted', deletedAt: new Date() }, // 已刪除
      ])

      const users = await Mongo.collection('mixed').get()
      expect(users.length).toBe(2) // 應該返回前兩個
    })
  })

  describe('與其他查詢條件結合', () => {
    it('應該正確結合 where 條件', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'Active User', status: 'active', deletedAt: null },
        { name: 'Inactive User', status: 'inactive', deletedAt: null },
        { name: 'Deleted Active', status: 'active', deletedAt: new Date() },
      ])

      const users = await Mongo.collection('users').where('status', 'active').get()

      expect(users.length).toBe(1)
      expect(users[0].name).toBe('Active User')
    })

    it('應該正確結合 orWhere 條件', async () => {
      await Mongo.collection('users').insertMany([
        { name: 'Admin', role: 'admin', deletedAt: null },
        { name: 'User', role: 'user', deletedAt: null },
        { name: 'Deleted Admin', role: 'admin', deletedAt: new Date() },
      ])

      const users = await Mongo.collection('users')
        .where('role', 'admin')
        .orWhere('role', 'moderator')
        .get()

      expect(users.length).toBe(1)
      expect(users[0].name).toBe('Admin')
    })
  })
})
