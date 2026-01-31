/**
 * Change Streams Performance Benchmark
 *
 * 測試 Change Streams 在不同場景下的效能
 */

import { afterAll, beforeAll, bench, describe } from 'bun:test'
import { Mongo } from '../src'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const describeBench = process.env.MONGODB_URI ? describe : describe.skip

describeBench('Change Streams Performance', () => {
  beforeAll(async () => {
    Mongo.configure({
      default: 'bench',
      connections: {
        bench: { uri: MONGODB_URI, database: 'change_streams_benchmark' },
      },
    })

    try {
      await Mongo.connect()
    } catch (error: any) {
      // Change Streams 需要 Replica Set
      if (error.message?.includes('replica set')) {
        console.log('Skipping change streams benchmarks: Replica set required')
      }
    }
  })

  afterAll(async () => {
    await Mongo.collection('events').deleteMany()
    await Mongo.disconnect()
  })

  describe('事件處理延遲', () => {
    bench('單一 stream：處理 100 個 insert 事件', async () => {
      const changes: any[] = []
      const stream = Mongo.collection('events').watch()

      const listener = (async () => {
        for await (const change of stream) {
          changes.push(change)
          if (changes.length >= 100) {
            break
          }
        }
      })()

      // 等待 stream 準備好
      await new Promise((resolve) => setTimeout(resolve, 100))

      // 插入 100 個文檔
      for (let i = 0; i < 100; i++) {
        await Mongo.collection('events').insert({
          type: 'test',
          value: i,
        })
      }

      await listener

      // 清理
      await Mongo.collection('events').deleteMany()
    })

    bench('高頻事件：每秒 50 個 insert', async () => {
      const changes: any[] = []
      const stream = Mongo.collection('events').watch()

      const listener = (async () => {
        for await (const change of stream) {
          changes.push(change)
          if (changes.length >= 50) {
            break
          }
        }
      })()

      await new Promise((resolve) => setTimeout(resolve, 100))

      // 快速插入 50 個文檔
      const promises = []
      for (let i = 0; i < 50; i++) {
        promises.push(
          Mongo.collection('events').insert({
            type: 'high-frequency',
            value: i,
          })
        )
      }
      await Promise.all(promises)

      await listener

      await Mongo.collection('events').deleteMany()
    })
  })

  describe('過濾器效能', () => {
    bench('無過濾器：處理 50 個事件', async () => {
      const changes: any[] = []
      const stream = Mongo.collection('events').watch()

      const listener = (async () => {
        for await (const change of stream) {
          changes.push(change)
          if (changes.length >= 50) {
            break
          }
        }
      })()

      await new Promise((resolve) => setTimeout(resolve, 100))

      for (let i = 0; i < 50; i++) {
        await Mongo.collection('events').insert({
          type: i % 2 === 0 ? 'even' : 'odd',
          value: i,
        })
      }

      await listener

      await Mongo.collection('events').deleteMany()
    })

    bench('簡單過濾器：只處理 insert 事件', async () => {
      const changes: any[] = []
      const stream = Mongo.collection('events').watch([{ $match: { operationType: 'insert' } }])

      const listener = (async () => {
        for await (const change of stream) {
          changes.push(change)
          if (changes.length >= 50) {
            break
          }
        }
      })()

      await new Promise((resolve) => setTimeout(resolve, 100))

      for (let i = 0; i < 50; i++) {
        await Mongo.collection('events').insert({
          type: 'filtered',
          value: i,
        })
      }

      await listener

      await Mongo.collection('events').deleteMany()
    })

    bench('複雜過濾器：過濾特定欄位值', async () => {
      const changes: any[] = []
      const stream = Mongo.collection('events').watch([
        {
          $match: {
            operationType: 'insert',
            'fullDocument.type': 'important',
          },
        },
      ])

      const listener = (async () => {
        for await (const change of stream) {
          changes.push(change)
          if (changes.length >= 10) {
            break
          }
        }
      })()

      await new Promise((resolve) => setTimeout(resolve, 100))

      // 插入 50 個文檔，只有 10 個是 important
      for (let i = 0; i < 50; i++) {
        await Mongo.collection('events').insert({
          type: i % 5 === 0 ? 'important' : 'normal',
          value: i,
        })
      }

      await listener

      await Mongo.collection('events').deleteMany()
    })
  })

  describe('多個監聽器', () => {
    bench('2 個並發 stream 處理相同事件', async () => {
      const changes1: any[] = []
      const changes2: any[] = []

      const stream1 = Mongo.collection('events').watch()
      const stream2 = Mongo.collection('events').watch()

      const listener1 = (async () => {
        for await (const change of stream1) {
          changes1.push(change)
          if (changes1.length >= 30) {
            break
          }
        }
      })()

      const listener2 = (async () => {
        for await (const change of stream2) {
          changes2.push(change)
          if (changes2.length >= 30) {
            break
          }
        }
      })()

      await new Promise((resolve) => setTimeout(resolve, 100))

      for (let i = 0; i < 30; i++) {
        await Mongo.collection('events').insert({
          type: 'multi-listener',
          value: i,
        })
      }

      await Promise.all([listener1, listener2])

      await Mongo.collection('events').deleteMany()
    })

    bench('5 個並發 stream 處理相同事件', async () => {
      const streams = Array.from({ length: 5 }, () => ({
        stream: Mongo.collection('events').watch(),
        changes: [] as any[],
      }))

      const listeners = streams.map(({ stream, changes }) =>
        (async () => {
          for await (const change of stream) {
            changes.push(change)
            if (changes.length >= 20) {
              break
            }
          }
        })()
      )

      await new Promise((resolve) => setTimeout(resolve, 100))

      for (let i = 0; i < 20; i++) {
        await Mongo.collection('events').insert({
          type: 'multi-stream',
          value: i,
        })
      }

      await Promise.all(listeners)

      await Mongo.collection('events').deleteMany()
    })
  })

  describe('不同事件類型', () => {
    bench('處理 insert 事件', async () => {
      const changes: any[] = []
      const stream = Mongo.collection('events').watch([{ $match: { operationType: 'insert' } }])

      const listener = (async () => {
        for await (const change of stream) {
          changes.push(change)
          if (changes.length >= 30) {
            break
          }
        }
      })()

      await new Promise((resolve) => setTimeout(resolve, 100))

      for (let i = 0; i < 30; i++) {
        await Mongo.collection('events').insert({
          type: 'insert-test',
          value: i,
        })
      }

      await listener

      await Mongo.collection('events').deleteMany()
    })

    bench('處理 update 事件', async () => {
      // 先插入文檔
      const docs = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        value: 0,
      }))

      await Mongo.collection('events').insertMany(docs)

      const changes: any[] = []
      const stream = Mongo.collection('events').watch([{ $match: { operationType: 'update' } }])

      const listener = (async () => {
        for await (const change of stream) {
          changes.push(change)
          if (changes.length >= 30) {
            break
          }
        }
      })()

      await new Promise((resolve) => setTimeout(resolve, 100))

      for (let i = 0; i < 30; i++) {
        await Mongo.collection('events')
          .where('id', i)
          .update({ value: i + 1 })
      }

      await listener

      await Mongo.collection('events').deleteMany()
    })
  })
})
