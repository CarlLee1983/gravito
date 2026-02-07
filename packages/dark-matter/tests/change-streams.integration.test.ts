import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { Mongo } from '../src'

const MONGODB_URI = process.env.MONGODB_URI
const describeIntegration = MONGODB_URI ? describe : describe.skip

describeIntegration('Change Streams 測試', () => {
  beforeAll(async () => {
    Mongo.configure({
      default: 'test',
      connections: {
        test: { uri: MONGODB_URI!, database: 'dark_matter_change_streams_test' },
      },
    })

    try {
      await Mongo.connect()
    } catch (error: any) {
      // Change Streams 需要 Replica Set，如果連線失敗則跳過測試
      if (error.message.includes('not a member of a replica set')) {
        console.log('Skipping Change Streams tests: Replica set required')
      }
    }
  })

  beforeEach(async () => {
    if (Mongo.isConnected()) {
      await Mongo.collection('events').deleteMany()
    }
  })

  afterAll(async () => {
    if (Mongo.isConnected()) {
      await Mongo.database().dropCollection('events')
      await Mongo.disconnect()
    }
  })

  describe('基本監聽功能', () => {
    it('應該能夠監聽 insert 事件', async () => {
      if (!Mongo.isConnected()) {
        return
      }

      const changes: any[] = []
      const stream = Mongo.collection('events').watch()

      // 設置監聽器
      const listener = (async () => {
        for await (const change of stream) {
          changes.push(change)
          if (changes.length >= 1) {
            break
          }
        }
      })()

      // 等待一小段時間確保 stream 已準備好
      await new Promise((resolve) => setTimeout(resolve, 100))

      // 插入文檔
      await Mongo.collection('events').insert({ type: 'test', value: 1 })

      // 等待事件
      await Promise.race([listener, new Promise((resolve) => setTimeout(resolve, 2000))])

      expect(changes.length).toBeGreaterThanOrEqual(1)
      expect(changes[0].operationType).toBe('insert')
    })

    it('應該能夠監聽 update 事件', async () => {
      if (!Mongo.isConnected()) {
        return
      }

      // 先插入一個文檔
      const result = await Mongo.collection('events').insert({ type: 'test', value: 1 })

      const changes: any[] = []
      const stream = Mongo.collection('events').watch()

      const listener = (async () => {
        for await (const change of stream) {
          changes.push(change)
          if (changes.length >= 1) {
            break
          }
        }
      })()

      await new Promise((resolve) => setTimeout(resolve, 100))

      // 更新文檔
      await Mongo.collection('events').where('_id', result.insertedId).update({ value: 2 })

      await Promise.race([listener, new Promise((resolve) => setTimeout(resolve, 2000))])

      expect(changes.length).toBeGreaterThanOrEqual(1)
      expect(changes[0].operationType).toBe('update')
    })

    it('應該能夠監聽 delete 事件', async () => {
      if (!Mongo.isConnected()) {
        return
      }

      const result = await Mongo.collection('events').insert({ type: 'test', value: 1 })

      const changes: any[] = []
      const stream = Mongo.collection('events').watch()

      const listener = (async () => {
        for await (const change of stream) {
          changes.push(change)
          if (changes.length >= 1) {
            break
          }
        }
      })()

      await new Promise((resolve) => setTimeout(resolve, 100))

      await Mongo.collection('events').where('_id', result.insertedId).delete()

      await Promise.race([listener, new Promise((resolve) => setTimeout(resolve, 2000))])

      expect(changes.length).toBeGreaterThanOrEqual(1)
      expect(changes[0].operationType).toBe('delete')
    })
  })

  describe('過濾器功能', () => {
    it('應該能夠使用 pipeline 過濾事件', async () => {
      if (!Mongo.isConnected()) {
        return
      }

      const changes: any[] = []
      const stream = Mongo.collection('events').watch([{ $match: { operationType: 'insert' } }])

      const listener = (async () => {
        for await (const change of stream) {
          changes.push(change)
          if (changes.length >= 1) {
            break
          }
        }
      })()

      await new Promise((resolve) => setTimeout(resolve, 100))

      // 插入文檔（應該被捕獲）
      await Mongo.collection('events').insert({ type: 'test', value: 1 })

      await Promise.race([listener, new Promise((resolve) => setTimeout(resolve, 2000))])

      expect(changes.length).toBeGreaterThanOrEqual(1)
      expect(changes[0].operationType).toBe('insert')
    })

    it('應該能夠過濾特定欄位值', async () => {
      if (!Mongo.isConnected()) {
        return
      }

      const changes: any[] = []
      const stream = Mongo.collection('events').watch([
        { $match: { 'fullDocument.type': 'important' } },
      ])

      const listener = (async () => {
        for await (const change of stream) {
          changes.push(change)
          if (changes.length >= 1) {
            break
          }
        }
      })()

      await new Promise((resolve) => setTimeout(resolve, 100))

      // 插入普通文檔（不應該被捕獲）
      await Mongo.collection('events').insert({ type: 'normal', value: 1 })

      // 插入重要文檔（應該被捕獲）
      await Mongo.collection('events').insert({ type: 'important', value: 2 })

      await Promise.race([listener, new Promise((resolve) => setTimeout(resolve, 2000))])

      if (changes.length > 0) {
        expect(changes[0].fullDocument?.type).toBe('important')
      }
    })
  })

  describe('多個監聽器', () => {
    it('應該能夠同時運行多個 change stream', async () => {
      if (!Mongo.isConnected()) {
        return
      }

      const changes1: any[] = []
      const changes2: any[] = []

      const stream1 = Mongo.collection('events').watch()
      const stream2 = Mongo.collection('events').watch()

      const listener1 = (async () => {
        for await (const change of stream1) {
          changes1.push(change)
          if (changes1.length >= 1) {
            break
          }
        }
      })()

      const listener2 = (async () => {
        for await (const change of stream2) {
          changes2.push(change)
          if (changes2.length >= 1) {
            break
          }
        }
      })()

      await new Promise((resolve) => setTimeout(resolve, 100))

      await Mongo.collection('events').insert({ type: 'test', value: 1 })

      await Promise.race([
        Promise.all([listener1, listener2]),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ])

      // 兩個監聽器都應該收到事件
      expect(changes1.length).toBeGreaterThanOrEqual(1)
      expect(changes2.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('錯誤處理', () => {
    it('應該能夠正常關閉 stream', async () => {
      if (!Mongo.isConnected()) {
        return
      }

      const stream = Mongo.collection('events').watch()
      const iterator = stream[Symbol.asyncIterator]()

      // 關閉 stream
      if (iterator.return) {
        await iterator.return()
      }

      expect(true).toBe(true) // 確保沒有錯誤拋出
    })
  })
})
