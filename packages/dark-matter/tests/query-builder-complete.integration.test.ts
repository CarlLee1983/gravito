import { beforeEach, describe, expect, it } from 'bun:test'
import { MongoAggregateBuilder, MongoQueryBuilder } from '../dist/index.js'

// ===== Mock Collection Factory =====

interface CapturedCalls {
  find?: { filter: unknown; options: unknown }
  findOne?: { filter: unknown; options: unknown }
  insertOne?: { doc: unknown; options: unknown }
  insertMany?: { docs: unknown[]; options: unknown }
  updateOne?: { filter: unknown; update: unknown; options: unknown }
  updateMany?: { filter: unknown; update: unknown; options: unknown }
  deleteOne?: { filter: unknown; options: unknown }
  deleteMany?: { filter: unknown; options: unknown }
  countDocuments?: { filter: unknown; options: unknown }
  distinct?: { field: string; filter: unknown; options: unknown }
  aggregate?: { pipeline: unknown[] }
  bulkWrite?: { operations: unknown[]; options: unknown }
  watch?: { pipeline: unknown[]; options: unknown }
  // 可配置的返回值
  findResults?: unknown[]
  findOneResult?: unknown
  insertOneResult?: { insertedId: { toString: () => string }; acknowledged: boolean }
  updateOneResult?: {
    matchedCount: number
    modifiedCount: number
    acknowledged: boolean
    upsertedId?: { toString: () => string }
  }
  updateManyResult?: {
    matchedCount: number
    modifiedCount: number
    acknowledged: boolean
    upsertedId?: { toString: () => string }
  }
  countResult?: number
  distinctResult?: unknown[]
  aggregateResults?: unknown[]
  bulkWriteResult?: unknown
  watchStream?: {
    hasNext: () => Promise<boolean>
    next: () => Promise<unknown>
    close: () => Promise<void>
  }
}

function createMockCollection() {
  const captured: CapturedCalls = {}

  const collection = {
    find: (filter: unknown, options?: unknown) => {
      captured.find = { filter, options }
      return { toArray: async () => captured.findResults ?? [] }
    },
    findOne: async (filter: unknown, options?: unknown) => {
      captured.findOne = { filter, options }
      return captured.findOneResult ?? null
    },
    insertOne: async (doc: unknown, options?: unknown) => {
      captured.insertOne = { doc, options }
      return (
        captured.insertOneResult ?? {
          insertedId: { toString: () => 'new-id-001' },
          acknowledged: true,
        }
      )
    },
    insertMany: async (docs: unknown[], options?: unknown) => {
      captured.insertMany = { docs, options }
      return {
        insertedIds: Object.fromEntries(docs.map((_, i) => [i, { toString: () => `id-${i}` }])),
        insertedCount: docs.length,
        acknowledged: true,
      }
    },
    updateOne: async (filter: unknown, update: unknown, options?: unknown) => {
      captured.updateOne = { filter, update, options }
      return (
        captured.updateOneResult ?? {
          matchedCount: 1,
          modifiedCount: 1,
          acknowledged: true,
        }
      )
    },
    updateMany: async (filter: unknown, update: unknown, options?: unknown) => {
      captured.updateMany = { filter, update, options }
      return (
        captured.updateManyResult ?? {
          matchedCount: 3,
          modifiedCount: 3,
          acknowledged: true,
        }
      )
    },
    deleteOne: async (filter: unknown, options?: unknown) => {
      captured.deleteOne = { filter, options }
      return { deletedCount: 1, acknowledged: true }
    },
    deleteMany: async (filter: unknown, options?: unknown) => {
      captured.deleteMany = { filter, options }
      return { deletedCount: 5, acknowledged: true }
    },
    countDocuments: async (filter: unknown, options?: unknown) => {
      captured.countDocuments = { filter, options }
      return captured.countResult ?? 0
    },
    distinct: async (field: string, filter: unknown, options?: unknown) => {
      captured.distinct = { field, filter, options }
      return captured.distinctResult ?? []
    },
    aggregate: (pipeline: unknown[]) => {
      captured.aggregate = { pipeline }
      return { toArray: async () => captured.aggregateResults ?? [] }
    },
    bulkWrite: async (operations: unknown[], options?: unknown) => {
      captured.bulkWrite = { operations, options }
      return (
        captured.bulkWriteResult ?? {
          insertedCount: 1,
          matchedCount: 1,
          modifiedCount: 1,
          deletedCount: 1,
          upsertedCount: 0,
          acknowledged: true,
        }
      )
    },
    watch: (pipeline: unknown[], options?: unknown) => {
      captured.watch = { pipeline, options }
      return (
        captured.watchStream ?? {
          hasNext: async () => false,
          next: async () => null,
          close: async () => {},
        }
      )
    },
  }

  return { collection, captured }
}

// ===== 匯入模組 =====
// 靜態導入避免 beforeAll 競態條件

// ===== 測試開始 =====

describe('MongoQueryBuilder 完整 Mock 測試', () => {
  let mockCol: ReturnType<typeof createMockCollection>['collection']
  let captured: CapturedCalls
  // biome-ignore lint/suspicious/noExplicitAny: 測試需要存取 MongoNativeCollection 型別
  let builder: any

  beforeEach(() => {
    const mock = createMockCollection()
    mockCol = mock.collection
    captured = mock.captured
    builder = new MongoQueryBuilder(mockCol as unknown, 'test_collection')
  })

  // ================================================================
  // WHERE 子句
  // ================================================================

  describe('where 子句', () => {
    it('應該建立等值過濾', () => {
      builder.where('name', 'Alice')
      const filter = builder.withTrashed().toFilter()
      expect(filter.name).toBe('Alice')
    })

    it('應該建立帶運算子的過濾', () => {
      builder.where('age', '>', 18)
      const filter = builder.withTrashed().toFilter()
      expect(filter.age).toEqual({ $gt: 18 })
    })

    it('應該支援所有運算子', () => {
      const operators: [string, string, unknown, unknown][] = [
        ['f1', '=', 10, 10],
        ['f2', '!=', 5, { $ne: 5 }],
        ['f3', '>', 0, { $gt: 0 }],
        ['f4', '>=', 1, { $gte: 1 }],
        ['f5', '<', 100, { $lt: 100 }],
        ['f6', '<=', 50, { $lte: 50 }],
        ['f7', 'in', [1, 2], { $in: [1, 2] }],
        ['f8', 'nin', [3, 4], { $nin: [3, 4] }],
        ['f9', 'exists', true, { $exists: true }],
        ['f10', 'regex', /test/, { $regex: /test/ }],
      ]

      for (const [field, op, val, expected] of operators) {
        const b = new MongoQueryBuilder(mockCol as unknown, 'test')
        b.withTrashed().where(field, op, val)
        expect(b.toFilter()[field]).toEqual(expected)
      }
    })

    it('應該處理未知運算子（回退為直接值）', () => {
      builder.withTrashed().where('field', 'unknown_op' as unknown, 'val')
      expect(builder.toFilter().field).toBe('val')
    })
  })

  describe('orWhere 子句', () => {
    it('應該建立 OR 條件（等值）', () => {
      builder.withTrashed().orWhere('status', 'active')
      const filter = builder.toFilter()
      expect(filter.$or).toBeDefined()
      expect(filter.$or).toContainEqual({ status: 'active' })
    })

    it('應該建立 OR 條件（帶運算子）', () => {
      builder.withTrashed().orWhere('age', '>', 30)
      const filter = builder.toFilter()
      expect(filter.$or).toBeDefined()
      expect(filter.$or).toContainEqual({ age: { $gt: 30 } })
    })

    it('應該合併 where 和 orWhere', () => {
      builder.withTrashed().where('role', 'admin').orWhere('role', 'editor')
      const filter = builder.toFilter()
      expect(filter.$or).toBeDefined()
      expect(filter.$or).toContainEqual({ role: 'admin' })
      expect(filter.$or).toContainEqual({ role: 'editor' })
    })
  })

  describe('whereIn / whereNotIn', () => {
    it('應該建立 $in 過濾', () => {
      builder.withTrashed().whereIn('role', ['admin', 'editor'])
      expect(builder.toFilter().role).toEqual({ $in: ['admin', 'editor'] })
    })

    it('應該建立 $nin 過濾', () => {
      builder.withTrashed().whereNotIn('status', ['deleted', 'banned'])
      expect(builder.toFilter().status).toEqual({
        $nin: ['deleted', 'banned'],
      })
    })
  })

  describe('whereNull / whereNotNull', () => {
    it('應該建立 null 過濾', () => {
      builder.withTrashed().whereNull('deletedAt')
      expect(builder.toFilter().deletedAt).toBeNull()
    })

    it('應該建立 $ne null 過濾', () => {
      builder.withTrashed().whereNotNull('publishedAt')
      expect(builder.toFilter().publishedAt).toEqual({ $ne: null })
    })
  })

  describe('whereExists', () => {
    it('應該建立 $exists: true 過濾', () => {
      builder.withTrashed().whereExists('metadata')
      expect(builder.toFilter().metadata).toEqual({ $exists: true })
    })

    it('應該建立 $exists: false 過濾', () => {
      builder.withTrashed().whereExists('deletedAt', false)
      expect(builder.toFilter().deletedAt).toEqual({ $exists: false })
    })
  })

  describe('whereRegex', () => {
    it('應該建立 $regex 字串模式過濾', () => {
      builder.withTrashed().whereRegex('email', '@gmail\\.com$')
      expect(builder.toFilter().email).toEqual({
        $regex: '@gmail\\.com$',
      })
    })

    it('應該建立 $regex RegExp 過濾', () => {
      builder.withTrashed().whereRegex('sku', /^PROD-/i)
      expect(builder.toFilter().sku).toEqual({ $regex: /^PROD-/i })
    })
  })

  // ================================================================
  // Projection
  // ================================================================

  describe('projection', () => {
    it('select 應該設定包含欄位', async () => {
      builder.withTrashed().select('name', 'email')
      await builder.get()
      expect(captured.find?.options).toMatchObject({
        projection: { name: 1, email: 1 },
      })
    })

    it('exclude 應該設定排除欄位', async () => {
      builder.withTrashed().exclude('password', 'token')
      await builder.get()
      expect(captured.find?.options).toMatchObject({
        projection: { password: 0, token: 0 },
      })
    })

    it('沒有 projection 時應該傳遞 undefined', async () => {
      builder.withTrashed()
      await builder.get()
      expect((captured.find?.options as Record<string, unknown>)?.projection).toBeUndefined()
    })
  })

  // ================================================================
  // 排序
  // ================================================================

  describe('排序', () => {
    it('orderBy 應該設定排序', async () => {
      builder.withTrashed().orderBy('name', 'asc').orderBy('score', 'desc')
      await builder.get()
      expect((captured.find?.options as Record<string, unknown>)?.sort).toEqual({
        name: 1,
        score: -1,
      })
    })

    it('latest 應該按 createdAt desc 排序', async () => {
      builder.withTrashed().latest()
      await builder.get()
      expect((captured.find?.options as Record<string, unknown>)?.sort).toEqual({
        createdAt: -1,
      })
    })

    it('oldest 應該按 createdAt asc 排序', async () => {
      builder.withTrashed().oldest()
      await builder.get()
      expect((captured.find?.options as Record<string, unknown>)?.sort).toEqual({
        createdAt: 1,
      })
    })

    it('latest/oldest 應該支援自訂欄位', async () => {
      builder.withTrashed().latest('updatedAt')
      await builder.get()
      expect((captured.find?.options as Record<string, unknown>)?.sort).toEqual({
        updatedAt: -1,
      })
    })

    it('沒有排序時應該傳遞 undefined', async () => {
      builder.withTrashed()
      await builder.get()
      expect((captured.find?.options as Record<string, unknown>)?.sort).toBeUndefined()
    })
  })

  // ================================================================
  // 分頁
  // ================================================================

  describe('分頁', () => {
    it('limit 應該設定限制數量', async () => {
      builder.withTrashed().limit(10)
      await builder.get()
      expect((captured.find?.options as Record<string, unknown>)?.limit).toBe(10)
    })

    it('skip 應該設定略過數量', async () => {
      builder.withTrashed().skip(20)
      await builder.get()
      expect((captured.find?.options as Record<string, unknown>)?.skip).toBe(20)
    })

    it('offset 應該是 skip 的別名', async () => {
      builder.withTrashed().offset(15)
      await builder.get()
      expect((captured.find?.options as Record<string, unknown>)?.skip).toBe(15)
    })
  })

  // ================================================================
  // 讀取操作
  // ================================================================

  describe('讀取操作', () => {
    it('get 應該執行查詢並返回結果', async () => {
      captured.findResults = [
        { _id: '1', name: 'Alice' },
        { _id: '2', name: 'Bob' },
      ]
      builder.withTrashed().where('active', true)
      const results = await builder.get()

      expect(results).toHaveLength(2)
      expect(results[0].name).toBe('Alice')
    })

    it('first 應該返回第一筆結果', async () => {
      captured.findOneResult = { _id: '1', name: 'Alice' }
      builder.withTrashed().where('email', 'alice@example.com')
      const result = await builder.first()

      expect(result).not.toBeNull()
      expect(result.name).toBe('Alice')
    })

    it('first 應該在無結果時返回 null', async () => {
      captured.findOneResult = null
      const result = await builder.withTrashed().first()
      expect(result).toBeNull()
    })

    it('find 應該根據 ID 查詢', async () => {
      captured.findOneResult = { _id: 'abc123def456abc123def456', name: 'Found' }
      const result = await builder.find('abc123def456abc123def456')

      expect(result).not.toBeNull()
      expect(result.name).toBe('Found')
      const passedFilter = captured.findOne?.filter as Record<string, unknown>
      expect(passedFilter._id).toBeDefined()
      expect(passedFilter._id?.toString()).toBe('abc123def456abc123def456')
    })

    it('count 應該返回數量', async () => {
      captured.countResult = 42
      builder.withTrashed().where('status', 'active')
      const count = await builder.count()

      expect(count).toBe(42)
    })

    it('exists 應該在 count > 0 時返回 true', async () => {
      captured.countResult = 1
      const result = await builder.withTrashed().exists()
      expect(result).toBe(true)
    })

    it('exists 應該在 count === 0 時返回 false', async () => {
      captured.countResult = 0
      const result = await builder.withTrashed().exists()
      expect(result).toBe(false)
    })

    it('exists 應該傳遞 limit: 1 選項', async () => {
      captured.countResult = 0
      await builder.withTrashed().exists()
      expect((captured.countDocuments?.options as Record<string, unknown>)?.limit).toBe(1)
    })

    it('distinct 應該返回唯一值', async () => {
      captured.distinctResult = ['admin', 'user', 'guest']
      const result = await builder.withTrashed().distinct('role')

      expect(result).toEqual(['admin', 'user', 'guest'])
      expect(captured.distinct?.field).toBe('role')
    })
  })

  // ================================================================
  // 寫入操作
  // ================================================================

  describe('寫入操作', () => {
    it('insert 應該插入文檔並返回結果', async () => {
      const result = await builder.insert({ name: 'New User', email: 'new@test.com' })

      expect(result.insertedId).toBe('new-id-001')
      expect(result.acknowledged).toBe(true)
      expect((captured.insertOne?.doc as Record<string, unknown>)?.name).toBe('New User')
    })

    it('insertMany 應該批次插入文檔', async () => {
      const docs = [{ name: 'A' }, { name: 'B' }, { name: 'C' }]
      const result = await builder.insertMany(docs)

      expect(result.insertedCount).toBe(3)
      expect(result.insertedIds).toHaveLength(3)
      expect(result.acknowledged).toBe(true)
    })

    it('update 應該自動包裝 $set', async () => {
      builder.withTrashed().where('name', 'Alice')
      const result = await builder.update({ status: 'active' })

      expect(result.matchedCount).toBe(1)
      expect(result.modifiedCount).toBe(1)
      expect(captured.updateOne?.update).toEqual({ $set: { status: 'active' } })
    })

    it('update 應該保留已有的 $ 運算子', async () => {
      builder.withTrashed().where('name', 'Alice')
      await builder.update({ $inc: { loginCount: 1 } })

      expect(captured.updateOne?.update).toEqual({ $inc: { loginCount: 1 } })
    })

    it('update 含 upsertedId 時應該返回它', async () => {
      captured.updateOneResult = {
        matchedCount: 0,
        modifiedCount: 0,
        acknowledged: true,
        upsertedId: { toString: () => 'upserted-id' },
      }
      const result = await builder.withTrashed().update({ name: 'New' })
      expect(result.upsertedId).toBe('upserted-id')
    })

    it('updateMany 應該更新多筆文檔', async () => {
      builder.withTrashed().where('status', 'pending')
      const result = await builder.updateMany({ status: 'processed' })

      expect(result.matchedCount).toBe(3)
      expect(result.modifiedCount).toBe(3)
      expect(captured.updateMany?.update).toEqual({
        $set: { status: 'processed' },
      })
    })

    it('updateMany 含 upsertedId 時應該返回它', async () => {
      captured.updateManyResult = {
        matchedCount: 0,
        modifiedCount: 0,
        acknowledged: true,
        upsertedId: { toString: () => 'upserted-many-id' },
      }
      const result = await builder.withTrashed().updateMany({ x: 1 })
      expect(result.upsertedId).toBe('upserted-many-id')
    })

    it('delete 應該刪除單筆文檔', async () => {
      builder.withTrashed().where('_id', 'to-delete')
      const result = await builder.delete()

      expect(result.deletedCount).toBe(1)
      expect(result.acknowledged).toBe(true)
    })

    it('deleteMany 應該刪除多筆文檔', async () => {
      builder.withTrashed().where('expired', true)
      const result = await builder.deleteMany()

      expect(result.deletedCount).toBe(5)
      expect(result.acknowledged).toBe(true)
    })
  })

  // ================================================================
  // 軟刪除
  // ================================================================

  describe('軟刪除', () => {
    it('softDelete 應該設定 deletedAt', async () => {
      builder.withTrashed().where('_id', 'user-1')
      const result = await builder.softDelete()

      expect(result.matchedCount).toBe(1)
      const update = captured.updateOne?.update as Record<string, unknown>
      expect(update).toHaveProperty('$set')
      expect((update.$set as Record<string, unknown>).deletedAt).toBeInstanceOf(Date)
    })

    it('softDeleteMany 應該批次設定 deletedAt', async () => {
      builder.withTrashed().where('status', 'inactive')
      const result = await builder.softDeleteMany()

      expect(result.matchedCount).toBe(3)
      const update = captured.updateMany?.update as Record<string, unknown>
      expect((update.$set as Record<string, unknown>).deletedAt).toBeInstanceOf(Date)
    })

    it('restore 應該將 deletedAt 設為 null', async () => {
      builder.withTrashed().where('_id', 'user-1')
      await builder.restore()

      const update = captured.updateOne?.update as Record<string, unknown>
      expect((update.$set as Record<string, unknown>).deletedAt).toBeNull()
    })

    it('restoreMany 應該批次將 deletedAt 設為 null', async () => {
      builder.withTrashed().where('status', 'archived')
      await builder.restoreMany()

      const update = captured.updateMany?.update as Record<string, unknown>
      expect((update.$set as Record<string, unknown>).deletedAt).toBeNull()
    })

    it('forceDelete 應該真正刪除', async () => {
      builder.withTrashed().where('_id', 'user-1')
      const result = await builder.forceDelete()

      expect(result.deletedCount).toBe(1)
      expect(captured.deleteOne).toBeDefined()
    })

    it('forceDeleteMany 應該批次真正刪除', async () => {
      builder.withTrashed().where('expired', true)
      const result = await builder.forceDeleteMany()

      expect(result.deletedCount).toBe(5)
      expect(captured.deleteMany).toBeDefined()
    })
  })

  // ================================================================
  // 軟刪除過濾模式
  // ================================================================

  describe('軟刪除過濾模式', () => {
    it('預設模式應該排除已刪除記錄', () => {
      builder.where('status', 'active')
      const filter = builder.toFilter()

      // 應該有 $and 包含軟刪除過濾
      expect(filter.$and).toBeDefined()
      const softFilter = filter.$and[1]
      expect(softFilter.$or).toContainEqual({ deletedAt: null })
      expect(softFilter.$or).toContainEqual({ deletedAt: { $exists: false } })
    })

    it('預設模式無 where 條件時應該只有軟刪除過濾', () => {
      const filter = builder.toFilter()
      expect(filter.$or).toBeDefined()
      expect(filter.$or).toContainEqual({ deletedAt: null })
    })

    it('withTrashed 不應該添加軟刪除過濾', () => {
      builder.withTrashed().where('active', true)
      const filter = builder.toFilter()

      expect(filter.active).toBe(true)
      expect(filter.$and).toBeUndefined()
    })

    it('onlyTrashed 應該只查詢已刪除記錄', () => {
      builder.onlyTrashed().where('role', 'admin')
      const filter = builder.toFilter()

      expect(filter.deletedAt).toEqual({ $ne: null })
      expect(filter.role).toBe('admin')
    })
  })

  // ================================================================
  // BulkWrite
  // ================================================================

  describe('bulkWrite', () => {
    it('應該執行批次寫入操作', async () => {
      const ops = [
        { insertOne: { document: { name: 'A' } } },
        {
          updateOne: {
            filter: { name: 'B' },
            update: { $set: { val: 2 } },
          },
        },
        { deleteOne: { filter: { name: 'C' } } },
      ]

      const result = await builder.bulkWrite(ops)

      expect(result.acknowledged).toBe(true)
      expect(result.insertedCount).toBe(1)
      expect(result.matchedCount).toBe(1)
      expect(result.modifiedCount).toBe(1)
      expect(result.deletedCount).toBe(1)
      expect(result.upsertedCount).toBe(0)
      expect(captured.bulkWrite?.operations).toEqual(ops)
    })
  })

  // ================================================================
  // Watch
  // ================================================================

  describe('watch', () => {
    it('應該迭代 change events', async () => {
      const events = [
        {
          operationType: 'insert',
          documentKey: { _id: '1' },
          fullDocument: { name: 'Test' },
        },
        {
          operationType: 'update',
          documentKey: { _id: '2' },
        },
      ]
      let idx = 0
      captured.watchStream = {
        hasNext: async () => idx < events.length,
        next: async () => events[idx++],
        close: async () => {},
      }

      const stream = builder.watch()
      const iterator = stream[Symbol.asyncIterator]()

      const first = await iterator.next()
      expect(first.done).toBe(false)
      expect(first.value.operationType).toBe('insert')

      const second = await iterator.next()
      expect(second.done).toBe(false)
      expect(second.value.operationType).toBe('update')

      const end = await iterator.next()
      expect(end.done).toBe(true)
    })

    it('應該支援 pipeline 和 options 參數', () => {
      const pipeline = [{ $match: { operationType: 'insert' } }]
      const options = { fullDocument: 'updateLookup' }

      builder.watch(pipeline, options)

      expect(captured.watch?.pipeline).toEqual(pipeline)
      expect(captured.watch?.options).toEqual(options)
    })

    it('無 pipeline 時應該傳遞空陣列', () => {
      builder.watch()
      expect(captured.watch?.pipeline).toEqual([])
    })

    it('應該在 return 時關閉串流', async () => {
      let closed = false
      captured.watchStream = {
        hasNext: async () => true,
        next: async () => ({ operationType: 'insert' }),
        close: async () => {
          closed = true
        },
      }

      const stream = builder.watch()
      const iterator = stream[Symbol.asyncIterator]()
      await iterator.return?.()

      expect(closed).toBe(true)
    })
  })

  // ================================================================
  // Aggregate
  // ================================================================

  describe('aggregate', () => {
    it('應該建立聚合管線並傳入現有 filter', () => {
      builder.withTrashed().where('status', 'active')
      const agg = builder.aggregate()
      const pipeline = agg.toPipeline()

      expect(pipeline).toHaveLength(1)
      expect(pipeline[0]).toEqual({ $match: { status: 'active' } })
    })

    it('無 filter 時不應該加入 $match', () => {
      const agg = builder.withTrashed().aggregate()
      const pipeline = agg.toPipeline()
      expect(pipeline).toHaveLength(0)
    })
  })

  // ================================================================
  // toFilter
  // ================================================================

  describe('toFilter', () => {
    it('應該產生空 filter（含預設軟刪除）', () => {
      const filter = builder.toFilter()
      // 預設模式有軟刪除過濾
      expect(filter.$or).toBeDefined()
    })

    it('應該產生只有 orWhere 的 filter', () => {
      builder.withTrashed().orWhere('a', 1).orWhere('b', 2)
      const filter = builder.toFilter()
      expect(filter.$or).toEqual([{ a: 1 }, { b: 2 }])
    })
  })

  // ================================================================
  // Clone
  // ================================================================

  describe('clone', () => {
    it('應該建立獨立的副本', async () => {
      builder.withTrashed().where('name', 'Alice').limit(10).orderBy('age', 'desc')
      const cloned = builder.clone()

      cloned.where('status', 'active')

      const originalFilter = builder.toFilter()
      const clonedFilter = cloned.toFilter()

      expect(originalFilter.status).toBeUndefined()
      expect(clonedFilter.status).toBe('active')
      expect(clonedFilter.name).toBe('Alice')
    })

    it('clone 應該保留所有查詢狀態', async () => {
      builder
        .withTrashed()
        .where('a', 1)
        .orWhere('b', 2)
        .select('x', 'y')
        .orderBy('z', 'desc')
        .limit(5)
        .skip(10)

      const cloned = builder.clone()
      // 透過 get 驗證選項傳遞正確
      await cloned.get()

      const opts = captured.find?.options as Record<string, unknown>
      expect(opts.projection).toEqual({ x: 1, y: 1 })
      expect(opts.sort).toEqual({ z: -1 })
      expect(opts.limit).toBe(5)
      expect(opts.skip).toBe(10)
    })
  })

  // ================================================================
  // Session 傳遞
  // ================================================================

  describe('session 傳遞', () => {
    it('應該將 session 傳遞到所有操作', async () => {
      const mockSession = { id: 'test-session' }
      const sessionBuilder = new MongoQueryBuilder(mockCol as unknown, 'test', mockSession)
      sessionBuilder.withTrashed().where('x', 1)

      await sessionBuilder.get()
      expect((captured.find?.options as Record<string, unknown>)?.session).toBe(mockSession)

      await sessionBuilder.first()
      expect((captured.findOne?.options as Record<string, unknown>)?.session).toBe(mockSession)

      await sessionBuilder.count()
      expect((captured.countDocuments?.options as Record<string, unknown>)?.session).toBe(
        mockSession
      )

      await sessionBuilder.insert({ a: 1 })
      expect((captured.insertOne?.options as Record<string, unknown>)?.session).toBe(mockSession)
    })
  })
})

// =================================================================
// MongoAggregateBuilder 測試
// =================================================================

describe('MongoAggregateBuilder 完整 Mock 測試', () => {
  let mockCol: ReturnType<typeof createMockCollection>['collection']
  let captured: CapturedCalls

  beforeEach(() => {
    const mock = createMockCollection()
    mockCol = mock.collection
    captured = mock.captured
  })

  describe('pipeline 建構', () => {
    it('應該建立 match 階段', () => {
      const agg = new MongoAggregateBuilder(mockCol as unknown)
      agg.match({ status: 'active' })
      expect(agg.toPipeline()).toEqual([{ $match: { status: 'active' } }])
    })

    it('應該建立 group 階段', () => {
      const agg = new MongoAggregateBuilder(mockCol as unknown)
      agg.group({ _id: '$category', total: { $sum: 1 } })
      expect(agg.toPipeline()).toEqual([{ $group: { _id: '$category', total: { $sum: 1 } } }])
    })

    it('應該建立 project 階段', () => {
      const agg = new MongoAggregateBuilder(mockCol as unknown)
      agg.project({ name: 1, _id: 0 })
      expect(agg.toPipeline()).toEqual([{ $project: { name: 1, _id: 0 } }])
    })

    it('應該建立 sort 階段（正規化方向）', () => {
      const agg = new MongoAggregateBuilder(mockCol as unknown)
      agg.sort({ name: 'asc', score: 'desc', rank: 1 })
      expect(agg.toPipeline()).toEqual([{ $sort: { name: 1, score: -1, rank: 1 } }])
    })

    it('應該建立 limit 階段', () => {
      const agg = new MongoAggregateBuilder(mockCol as unknown)
      agg.limit(10)
      expect(agg.toPipeline()).toEqual([{ $limit: 10 }])
    })

    it('應該建立 skip 階段', () => {
      const agg = new MongoAggregateBuilder(mockCol as unknown)
      agg.skip(20)
      expect(agg.toPipeline()).toEqual([{ $skip: 20 }])
    })

    it('應該建立 unwind 階段（字串）', () => {
      const agg = new MongoAggregateBuilder(mockCol as unknown)
      agg.unwind('$tags')
      expect(agg.toPipeline()).toEqual([{ $unwind: '$tags' }])
    })

    it('應該建立 unwind 階段（物件選項）', () => {
      const agg = new MongoAggregateBuilder(mockCol as unknown)
      agg.unwind({ path: '$tags', preserveNullAndEmptyArrays: true })
      expect(agg.toPipeline()).toEqual([
        {
          $unwind: { path: '$tags', preserveNullAndEmptyArrays: true },
        },
      ])
    })

    it('應該建立 lookup 階段', () => {
      const agg = new MongoAggregateBuilder(mockCol as unknown)
      agg.lookup({
        from: 'orders',
        localField: 'userId',
        foreignField: '_id',
        as: 'userOrders',
      })
      expect(agg.toPipeline()).toEqual([
        {
          $lookup: {
            from: 'orders',
            localField: 'userId',
            foreignField: '_id',
            as: 'userOrders',
          },
        },
      ])
    })

    it('應該建立 addFields 階段', () => {
      const agg = new MongoAggregateBuilder(mockCol as unknown)
      agg.addFields({ fullName: { $concat: ['$first', ' ', '$last'] } })
      expect(agg.toPipeline()).toEqual([
        { $addFields: { fullName: { $concat: ['$first', ' ', '$last'] } } },
      ])
    })

    it('應該建立 count 階段', () => {
      const agg = new MongoAggregateBuilder(mockCol as unknown)
      agg.count('totalItems')
      expect(agg.toPipeline()).toEqual([{ $count: 'totalItems' }])
    })

    it('constructor 含初始 filter 時應該加入 $match', () => {
      const agg = new MongoAggregateBuilder(mockCol as unknown, {
        status: 'active',
      })
      expect(agg.toPipeline()).toEqual([{ $match: { status: 'active' } }])
    })

    it('constructor 含空 filter 時不應該加入 $match', () => {
      const agg = new MongoAggregateBuilder(mockCol as unknown, {})
      expect(agg.toPipeline()).toEqual([])
    })
  })

  describe('鏈式呼叫', () => {
    it('應該支援完整的 pipeline 鏈式建構', () => {
      const agg = new MongoAggregateBuilder(mockCol as unknown)
      agg
        .match({ active: true })
        .group({ _id: '$category', count: { $sum: 1 } })
        .sort({ count: 'desc' })
        .limit(5)
        .project({ category: '$_id', count: 1, _id: 0 })

      const pipeline = agg.toPipeline()
      expect(pipeline).toHaveLength(5)
      expect(pipeline[0]).toHaveProperty('$match')
      expect(pipeline[1]).toHaveProperty('$group')
      expect(pipeline[2]).toHaveProperty('$sort')
      expect(pipeline[3]).toHaveProperty('$limit')
      expect(pipeline[4]).toHaveProperty('$project')
    })
  })

  describe('執行', () => {
    it('get 應該執行聚合並返回結果', async () => {
      captured.aggregateResults = [
        { _id: 'electronics', total: 150 },
        { _id: 'clothing', total: 80 },
      ]

      const agg = new MongoAggregateBuilder(mockCol as unknown)
      agg.match({ active: true }).group({ _id: '$cat', total: { $sum: 1 } })
      const results = await agg.get()

      expect(results).toHaveLength(2)
      expect(results[0]._id).toBe('electronics')
      expect(captured.aggregate?.pipeline).toHaveLength(2)
    })

    it('first 應該返回第一筆結果', async () => {
      captured.aggregateResults = [{ _id: 'top', score: 100 }]

      const agg = new MongoAggregateBuilder(mockCol as unknown)
      agg.match({ active: true })
      const result = await agg.first()

      expect(result).not.toBeNull()
      expect(result._id).toBe('top')
      // first() 應該加入 $limit: 1
      const pipeline = captured.aggregate?.pipeline as Record<string, unknown>[]
      expect(pipeline[pipeline.length - 1]).toEqual({ $limit: 1 })
    })

    it('first 無結果時應該返回 null', async () => {
      captured.aggregateResults = []

      const agg = new MongoAggregateBuilder(mockCol as unknown)
      const result = await agg.first()

      expect(result).toBeNull()
    })

    it('toPipeline 應該返回 pipeline 副本', () => {
      const agg = new MongoAggregateBuilder(mockCol as unknown)
      agg.match({ x: 1 })
      const p1 = agg.toPipeline()
      const p2 = agg.toPipeline()
      expect(p1).toEqual(p2)
      expect(p1).not.toBe(p2) // 不同參照
    })
  })
})
