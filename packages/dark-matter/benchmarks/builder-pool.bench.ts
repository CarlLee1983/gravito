/**
 * Builder Pool Performance Benchmark
 *
 * 測試 Builder 物件池在高頻場景下的效能影響
 */

import { afterAll, beforeAll, bench, describe } from 'bun:test'
import { Mongo } from '../src'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const ITERATIONS = 10000 // 模擬 10k 請求

// 只在有 MongoDB 時執行
const describeBench = process.env.MONGODB_URI ? describe : describe.skip

describeBench('Builder Pool Performance', () => {
  beforeAll(async () => {
    Mongo.configure({
      default: 'bench',
      connections: {
        bench: { uri: MONGODB_URI, database: 'benchmark_test' },
      },
    })
    await Mongo.connect()

    // 插入測試資料
    const docs = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `User ${i}`,
      email: `user${i}@example.com`,
      status: i % 2 === 0 ? 'active' : 'inactive',
      createdAt: new Date(),
    }))
    await Mongo.collection('benchmark_users').deleteMany()
    await Mongo.collection('benchmark_users').insertMany(docs)
  })

  afterAll(async () => {
    await Mongo.collection('benchmark_users').deleteMany()
    await Mongo.disconnect()
  })

  describe('查詢效能比較', () => {
    bench('基準：10k 簡單查詢（當前實作）', async () => {
      for (let i = 0; i < ITERATIONS; i++) {
        await Mongo.collection('benchmark_users')
          .where('id', i % 1000)
          .first()
      }
    })

    bench('基準：10k where + select 查詢', async () => {
      for (let i = 0; i < ITERATIONS; i++) {
        await Mongo.collection('benchmark_users')
          .where('status', 'active')
          .select('name', 'email')
          .limit(10)
          .get()
      }
    })

    bench('基準：10k 複雜查詢', async () => {
      for (let i = 0; i < ITERATIONS; i++) {
        await Mongo.collection('benchmark_users')
          .where('status', 'active')
          .where('id', '>', i % 500)
          .orderBy('createdAt', 'desc')
          .limit(10)
          .get()
      }
    })
  })

  describe('Builder 建立開銷', () => {
    bench('建立 10k Builder 實例（不執行查詢）', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const _builder = Mongo.collection('benchmark_users')
          .where('id', i)
          .select('name', 'email')
          .limit(1)
        // 不執行查詢，只測試 Builder 建立開銷
      }
    })

    bench('建立並複製 10k Builder 實例', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const builder = Mongo.collection('benchmark_users').where('id', i)
        const _cloned = builder.clone()
        // 測試 clone 的開銷
      }
    })
  })

  describe('記憶體壓力測試', () => {
    bench('併發：100 個並行查詢 x 100 輪', async () => {
      for (let round = 0; round < 100; round++) {
        const promises = []
        for (let i = 0; i < 100; i++) {
          promises.push(
            Mongo.collection('benchmark_users')
              .where('id', i % 1000)
              .first()
          )
        }
        await Promise.all(promises)
      }
    })
  })
})

describe('Builder Pool 實作模擬', () => {
  // 模擬物件池實作
  class SimpleBuilderPool<T> {
    private pool: T[] = []
    private maxSize: number

    constructor(maxSize = 100) {
      this.maxSize = maxSize
    }

    acquire(factory: () => T): T {
      if (this.pool.length > 0) {
        return this.pool.pop()!
      }
      return factory()
    }

    release(obj: T): void {
      if (this.pool.length < this.maxSize) {
        this.pool.push(obj)
      }
    }

    stats() {
      return {
        poolSize: this.pool.length,
        maxSize: this.maxSize,
      }
    }
  }

  bench('物件池模擬：10k 物件重用', () => {
    const pool = new SimpleBuilderPool<{ value: number }>(100)

    for (let i = 0; i < ITERATIONS; i++) {
      const obj = pool.acquire(() => ({ value: i }))
      obj.value = i
      pool.release(obj)
    }
  })

  bench('無物件池：10k 物件建立', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const _obj = { value: i }
      // 每次都建立新物件
    }
  })
})

// 執行建議
console.log('\n執行基準測試：')
console.log('  MONGODB_URI=mongodb://localhost:27017 bun run benchmarks/builder-pool.bench.ts')
console.log('\n測試項目：')
console.log('  1. 查詢效能（簡單/複雜查詢）')
console.log('  2. Builder 建立開銷')
console.log('  3. 記憶體壓力（併發查詢）')
console.log('  4. 物件池效益模擬')
console.log('\n預期結果：')
console.log('  - 如果 Builder 建立開銷 < 總執行時間的 10%，物件池效益有限')
console.log('  - 如果記憶體壓力測試顯示大量 GC，物件池可能有幫助')
console.log('')
