/**
 * Soft Delete Performance Benchmark
 *
 * 測試軟刪除功能對查詢和刪除操作的效能影響
 */

import { afterAll, beforeAll, bench, describe } from 'bun:test'
import { Mongo } from '../src'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const describeBench = process.env.MONGODB_URI ? describe : describe.skip

describeBench('Soft Delete Performance', () => {
  beforeAll(async () => {
    Mongo.configure({
      default: 'bench',
      connections: {
        bench: { uri: MONGODB_URI, database: 'soft_delete_benchmark' },
      },
    })
    await Mongo.connect()
  })

  afterAll(async () => {
    await Mongo.collection('soft_delete_users').deleteMany()
    await Mongo.disconnect()
  })

  describe('查詢效能比較', () => {
    beforeAll(async () => {
      await Mongo.collection('soft_delete_users').deleteMany()

      // 插入 10000 筆記錄，其中 30% 已軟刪除
      const docs = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        status: 'active',
        deletedAt: i % 3 === 0 ? new Date() : null,
      }))

      await Mongo.collection('soft_delete_users').insertMany(docs)
    })

    bench('基準：查詢所有記錄（無軟刪除過濾）', async () => {
      await Mongo.collection('soft_delete_users').withTrashed().limit(100).get()
    })

    bench('預設：查詢記錄（自動過濾軟刪除）', async () => {
      await Mongo.collection('soft_delete_users').limit(100).get()
    })

    bench('查詢記錄 + withTrashed', async () => {
      await Mongo.collection('soft_delete_users').withTrashed().limit(100).get()
    })

    bench('查詢記錄 + onlyTrashed', async () => {
      await Mongo.collection('soft_delete_users').onlyTrashed().limit(100).get()
    })

    bench('複雜查詢 + 軟刪除過濾', async () => {
      await Mongo.collection('soft_delete_users')
        .where('status', 'active')
        .where('id', '>', 1000)
        .limit(100)
        .get()
    })
  })

  describe('刪除操作效能', () => {
    beforeAll(async () => {
      await Mongo.collection('soft_delete_test').deleteMany()

      const docs = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Test ${i}`,
        deletedAt: null,
      }))

      await Mongo.collection('soft_delete_test').insertMany(docs)
    })

    afterAll(async () => {
      await Mongo.collection('soft_delete_test').deleteMany()
    })

    bench('硬刪除單一記錄', async () => {
      await Mongo.collection('soft_delete_test').where('id', 500).forceDelete()
    })

    bench('軟刪除單一記錄', async () => {
      await Mongo.collection('soft_delete_test').where('id', 501).softDelete()
    })

    bench('批次軟刪除 10 筆記錄', async () => {
      await Mongo.collection('soft_delete_test')
        .where('id', '>=', 100)
        .where('id', '<', 110)
        .softDeleteMany()
    })

    bench('批次硬刪除 10 筆記錄', async () => {
      await Mongo.collection('soft_delete_test')
        .where('id', '>=', 200)
        .where('id', '<', 210)
        .deleteMany()
    })
  })

  describe('恢復操作效能', () => {
    beforeAll(async () => {
      await Mongo.collection('soft_delete_restore').deleteMany()

      const docs = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Test ${i}`,
        deletedAt: i % 2 === 0 ? new Date() : null,
      }))

      await Mongo.collection('soft_delete_restore').insertMany(docs)
    })

    afterAll(async () => {
      await Mongo.collection('soft_delete_restore').deleteMany()
    })

    bench('恢復單一軟刪除記錄', async () => {
      await Mongo.collection('soft_delete_restore').where('id', 100).restore()
    })

    bench('批次恢復 10 筆軟刪除記錄', async () => {
      await Mongo.collection('soft_delete_restore')
        .where('id', '>=', 200)
        .where('id', '<', 210)
        .restoreMany()
    })
  })

  describe('索引影響測試', () => {
    beforeAll(async () => {
      await Mongo.collection('soft_delete_index').deleteMany()

      // 建立 deletedAt 索引
      await Mongo.database().collection('soft_delete_index').createIndex({ deletedAt: 1 })

      const docs = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        deletedAt: i % 3 === 0 ? new Date() : null,
      }))

      await Mongo.collection('soft_delete_index').insertMany(docs)
    })

    afterAll(async () => {
      await Mongo.database().collection('soft_delete_index').dropIndex('deletedAt_1')
      await Mongo.collection('soft_delete_index').deleteMany()
    })

    bench('有索引：查詢未刪除記錄', async () => {
      await Mongo.collection('soft_delete_index').limit(100).get()
    })

    bench('有索引：查詢已刪除記錄', async () => {
      await Mongo.collection('soft_delete_index').onlyTrashed().limit(100).get()
    })
  })

  describe('Count 效能比較', () => {
    beforeAll(async () => {
      await Mongo.collection('soft_delete_count').deleteMany()

      const docs = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        deletedAt: i % 4 === 0 ? new Date() : null,
      }))

      await Mongo.collection('soft_delete_count').insertMany(docs)
    })

    afterAll(async () => {
      await Mongo.collection('soft_delete_count').deleteMany()
    })

    bench('計數：所有記錄（含軟刪除）', async () => {
      await Mongo.collection('soft_delete_count').withTrashed().count()
    })

    bench('計數：未刪除記錄', async () => {
      await Mongo.collection('soft_delete_count').count()
    })

    bench('計數：已刪除記錄', async () => {
      await Mongo.collection('soft_delete_count').onlyTrashed().count()
    })
  })
})
