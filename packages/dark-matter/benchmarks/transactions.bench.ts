/**
 * Transactions Performance Benchmark
 *
 * 測試交易對效能的影響
 */

import { afterAll, beforeAll, bench, describe } from 'bun:test'
import { Mongo } from '../src'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const describeBench = process.env.MONGODB_URI ? describe : describe.skip

describeBench('Transactions Performance', () => {
  beforeAll(async () => {
    Mongo.configure({
      default: 'bench',
      connections: {
        bench: { uri: MONGODB_URI, database: 'transaction_benchmark' },
      },
    })

    try {
      await Mongo.connect()
    } catch (error: any) {
      // Transactions 需要 Replica Set
      if (error.message?.includes('replica set')) {
        console.log('Skipping transaction benchmarks: Replica set required')
      }
    }
  })

  afterAll(async () => {
    await Mongo.collection('accounts').deleteMany()
    await Mongo.collection('transactions').deleteMany()
    await Mongo.disconnect()
  })

  describe('無交易 vs 有交易', () => {
    beforeAll(async () => {
      await Mongo.collection('accounts').deleteMany()

      const accounts = Array.from({ length: 100 }, (_, i) => ({
        accountId: i,
        balance: 1000,
      }))

      await Mongo.collection('accounts').insertMany(accounts)
    })

    bench('無交易：單一更新操作', async () => {
      await Mongo.collection('accounts').where('accountId', 50).update({ balance: 1100 })
    })

    bench('有交易：單一更新操作', async () => {
      await Mongo.transaction(async (session) => {
        await Mongo.collection('accounts')
          .where('accountId', 50)
          .update({ balance: 1100 }, { session })
      })
    })

    bench('無交易：兩個更新操作', async () => {
      await Mongo.collection('accounts').where('accountId', 10).update({ balance: 900 })

      await Mongo.collection('accounts').where('accountId', 20).update({ balance: 1100 })
    })

    bench('有交易：兩個更新操作（轉帳）', async () => {
      await Mongo.transaction(async (session) => {
        await Mongo.collection('accounts')
          .where('accountId', 10)
          .update({ balance: 900 }, { session })

        await Mongo.collection('accounts')
          .where('accountId', 20)
          .update({ balance: 1100 }, { session })
      })
    })
  })

  describe('交易大小影響', () => {
    beforeAll(async () => {
      await Mongo.collection('transactions').deleteMany()
    })

    bench('交易：5 個插入操作', async () => {
      await Mongo.transaction(async (session) => {
        for (let i = 0; i < 5; i++) {
          await Mongo.collection('transactions').insert(
            { amount: 100, timestamp: new Date() },
            { session }
          )
        }
      })

      await Mongo.collection('transactions').deleteMany()
    })

    bench('交易：50 個插入操作', async () => {
      await Mongo.transaction(async (session) => {
        for (let i = 0; i < 50; i++) {
          await Mongo.collection('transactions').insert(
            { amount: 100, timestamp: new Date() },
            { session }
          )
        }
      })

      await Mongo.collection('transactions').deleteMany()
    })

    bench('交易：100 個插入操作', async () => {
      await Mongo.transaction(async (session) => {
        const docs = Array.from({ length: 100 }, () => ({
          amount: 100,
          timestamp: new Date(),
        }))

        await Mongo.collection('transactions').insertMany(docs, { session })
      })

      await Mongo.collection('transactions').deleteMany()
    })
  })

  describe('跨 Collection 交易', () => {
    beforeAll(async () => {
      await Mongo.collection('orders').deleteMany()
      await Mongo.collection('inventory').deleteMany()

      const inventory = Array.from({ length: 100 }, (_, i) => ({
        productId: i,
        stock: 100,
      }))

      await Mongo.collection('inventory').insertMany(inventory)
    })

    afterAll(async () => {
      await Mongo.collection('orders').deleteMany()
      await Mongo.collection('inventory').deleteMany()
    })

    bench('跨 Collection 交易：訂單 + 庫存更新', async () => {
      await Mongo.transaction(async (session) => {
        await Mongo.collection('orders').insert(
          {
            productId: 50,
            quantity: 5,
            timestamp: new Date(),
          },
          { session }
        )

        await Mongo.collection('inventory')
          .where('productId', 50)
          .update({ stock: 95 }, { session })
      })
    })
  })

  describe('並發交易', () => {
    bench('10 個並發交易', async () => {
      const promises = []

      for (let i = 0; i < 10; i++) {
        promises.push(
          Mongo.transaction(async (session) => {
            await Mongo.collection('accounts')
              .where('accountId', i)
              .update({ balance: 1000 }, { session })
          })
        )
      }

      await Promise.all(promises)
    })

    bench('50 個並發交易', async () => {
      const promises = []

      for (let i = 0; i < 50; i++) {
        promises.push(
          Mongo.transaction(async (session) => {
            await Mongo.collection('accounts')
              .where('accountId', i % 100)
              .update({ balance: 1000 }, { session })
          })
        )
      }

      await Promise.all(promises)
    })
  })
})
