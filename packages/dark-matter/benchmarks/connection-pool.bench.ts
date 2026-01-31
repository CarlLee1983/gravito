/**
 * Connection Pool Performance Benchmark
 *
 * 測試不同連線池配置對效能的影響
 */

import { afterAll, beforeAll, bench, describe } from 'bun:test'
import { Mongo } from '../src'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const describeBench = process.env.MONGODB_URI ? describe : describe.skip

describeBench('Connection Pool Performance', () => {
  afterAll(async () => {
    await Mongo.disconnect()
  })

  describe('不同 Pool 大小比較', () => {
    bench('Pool Size 10: 100 個並發查詢', async () => {
      Mongo.configure({
        default: 'pool10',
        connections: {
          pool10: {
            uri: MONGODB_URI,
            database: 'pool_benchmark',
            maxPoolSize: 10,
            minPoolSize: 5,
          },
        },
      })

      await Mongo.connect()

      const promises = []
      for (let i = 0; i < 100; i++) {
        promises.push(Mongo.collection('test').where('id', i).first())
      }

      await Promise.all(promises)
      await Mongo.disconnect()
    })

    bench('Pool Size 50: 100 個並發查詢', async () => {
      Mongo.configure({
        default: 'pool50',
        connections: {
          pool50: {
            uri: MONGODB_URI,
            database: 'pool_benchmark',
            maxPoolSize: 50,
            minPoolSize: 10,
          },
        },
      })

      await Mongo.connect()

      const promises = []
      for (let i = 0; i < 100; i++) {
        promises.push(Mongo.collection('test').where('id', i).first())
      }

      await Promise.all(promises)
      await Mongo.disconnect()
    })

    bench('Pool Size 100: 100 個並發查詢', async () => {
      Mongo.configure({
        default: 'pool100',
        connections: {
          pool100: {
            uri: MONGODB_URI,
            database: 'pool_benchmark',
            maxPoolSize: 100,
            minPoolSize: 20,
          },
        },
      })

      await Mongo.connect()

      const promises = []
      for (let i = 0; i < 100; i++) {
        promises.push(Mongo.collection('test').where('id', i).first())
      }

      await Promise.all(promises)
      await Mongo.disconnect()
    })
  })

  describe('高並發場景', () => {
    beforeAll(async () => {
      Mongo.configure({
        default: 'concurrent',
        connections: {
          concurrent: {
            uri: MONGODB_URI,
            database: 'pool_benchmark',
            maxPoolSize: 50,
          },
        },
      })

      await Mongo.connect()

      // 插入測試資料
      const docs = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Test ${i}`,
        value: Math.random(),
      }))

      await Mongo.collection('concurrent_test').deleteMany()
      await Mongo.collection('concurrent_test').insertMany(docs)
    })

    afterAll(async () => {
      await Mongo.collection('concurrent_test').deleteMany()
      await Mongo.disconnect()
    })

    bench('10 個並發查詢', async () => {
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(Mongo.collection('concurrent_test').where('id', i).first())
      }
      await Promise.all(promises)
    })

    bench('50 個並發查詢', async () => {
      const promises = []
      for (let i = 0; i < 50; i++) {
        promises.push(Mongo.collection('concurrent_test').where('id', i).first())
      }
      await Promise.all(promises)
    })

    bench('100 個並發查詢', async () => {
      const promises = []
      for (let i = 0; i < 100; i++) {
        promises.push(Mongo.collection('concurrent_test').where('id', i).first())
      }
      await Promise.all(promises)
    })

    bench('500 個並發查詢', async () => {
      const promises = []
      for (let i = 0; i < 500; i++) {
        promises.push(
          Mongo.collection('concurrent_test')
            .where('id', i % 1000)
            .first()
        )
      }
      await Promise.all(promises)
    })
  })

  describe('連線重用 vs 新建', () => {
    beforeAll(async () => {
      Mongo.configure({
        default: 'reuse',
        connections: {
          reuse: {
            uri: MONGODB_URI,
            database: 'pool_benchmark',
            maxPoolSize: 20,
          },
        },
      })

      await Mongo.connect()

      const docs = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Test ${i}` }))
      await Mongo.collection('reuse_test').deleteMany()
      await Mongo.collection('reuse_test').insertMany(docs)
    })

    afterAll(async () => {
      await Mongo.collection('reuse_test').deleteMany()
      await Mongo.disconnect()
    })

    bench('連線重用：序列執行 100 個查詢', async () => {
      for (let i = 0; i < 100; i++) {
        await Mongo.collection('reuse_test').where('id', i).first()
      }
    })

    bench('連線重用：並發執行 100 個查詢', async () => {
      const promises = []
      for (let i = 0; i < 100; i++) {
        promises.push(Mongo.collection('reuse_test').where('id', i).first())
      }
      await Promise.all(promises)
    })
  })

  describe('長連線 vs 短連線', () => {
    bench('長連線：保持連線執行 100 個查詢', async () => {
      Mongo.configure({
        default: 'long',
        connections: {
          long: { uri: MONGODB_URI, database: 'pool_benchmark' },
        },
      })

      await Mongo.connect()

      for (let i = 0; i < 100; i++) {
        await Mongo.collection('test').where('id', i).first()
      }

      await Mongo.disconnect()
    })

    bench('短連線：每次查詢都重新連線（不推薦）', async () => {
      for (let i = 0; i < 10; i++) {
        // 只測試 10 次避免太慢
        Mongo.configure({
          default: `short${i}`,
          connections: {
            [`short${i}`]: { uri: MONGODB_URI, database: 'pool_benchmark' },
          },
        })

        await Mongo.connect()
        await Mongo.collection('test').where('id', i).first()
        await Mongo.disconnect()
      }
    })
  })

  describe('Pool 耗盡情況', () => {
    beforeAll(async () => {
      Mongo.configure({
        default: 'small',
        connections: {
          small: {
            uri: MONGODB_URI,
            database: 'pool_benchmark',
            maxPoolSize: 5, // 小連線池
            minPoolSize: 2,
          },
        },
      })

      await Mongo.connect()
    })

    afterAll(async () => {
      await Mongo.disconnect()
    })

    bench('Pool 未耗盡：5 個並發查詢（Pool Size 5）', async () => {
      const promises = []
      for (let i = 0; i < 5; i++) {
        promises.push(Mongo.collection('test').where('id', i).first())
      }
      await Promise.all(promises)
    })

    bench('Pool 接近耗盡：20 個並發查詢（Pool Size 5）', async () => {
      const promises = []
      for (let i = 0; i < 20; i++) {
        promises.push(Mongo.collection('test').where('id', i).first())
      }
      await Promise.all(promises)
    })
  })
})
