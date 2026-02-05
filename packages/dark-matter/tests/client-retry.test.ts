import { beforeEach, describe, expect, it, mock } from 'bun:test'

type MongoClientOptions = {
  maxPoolSize?: number
  minPoolSize?: number
  connectTimeoutMS?: number
  socketTimeoutMS?: number
}

let connectAttempts = 0
let shouldFailTimes = 0
let connectionErrors: string[] = []

class MongoClientMock {
  constructor(
    public uri: string,
    public options?: MongoClientOptions
  ) {}

  async connect() {
    connectAttempts++

    if (shouldFailTimes > 0) {
      shouldFailTimes--
      const error = connectionErrors[connectAttempts - 1] || 'Connection failed'
      throw new Error(error)
    }
  }

  async close() {}

  db(_name?: string) {
    return {
      collection: (name: string) => ({ name }),
    }
  }
}

mock.module('mongodb', () => ({
  MongoClient: MongoClientMock,
  ObjectId: class {
    _id: string
    constructor(id: string) {
      this._id = id
    }
    toString() {
      return this._id
    }
  },
  GridFSBucket: class {},
}))

let MongoClient: typeof import('../src/MongoClient').MongoClient

describe('MongoClient 重試邏輯', () => {
  beforeEach(async () => {
    // 動態 import 以確保 mock 生效
    const module = await import('../src/MongoClient')
    MongoClient = module.MongoClient

    // 重置測試狀態
    connectAttempts = 0
    shouldFailTimes = 0
    connectionErrors = []
  })

  describe('連線失敗後重試', () => {
    it('應該在第一次失敗後重試並成功連線', async () => {
      shouldFailTimes = 1 // 第一次失敗，第二次成功

      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
      })

      await client.connect({
        maxRetries: 3,
        retryDelayMs: 10, // 使用較短的延遲以加快測試
      })

      expect(connectAttempts).toBe(2) // 1 次失敗 + 1 次成功
      expect(client.isConnected()).toBe(true)
    })

    it('應該在多次失敗後最終成功連線', async () => {
      shouldFailTimes = 2 // 前兩次失敗，第三次成功

      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
      })

      await client.connect({
        maxRetries: 3,
        retryDelayMs: 10,
      })

      expect(connectAttempts).toBe(3) // 2 次失敗 + 1 次成功
      expect(client.isConnected()).toBe(true)
    })

    it('應該在達到最大重試次數後拋出錯誤', async () => {
      shouldFailTimes = 5 // 持續失敗
      connectionErrors = Array(5).fill('Network timeout')

      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
      })

      await expect(
        client.connect({
          maxRetries: 3,
          retryDelayMs: 10,
        })
      ).rejects.toThrow(/Failed to connect to MongoDB after 4 attempts/)

      expect(connectAttempts).toBe(4) // 1 次初始嘗試 + 3 次重試
      expect(client.isConnected()).toBe(false)
    })
  })

  describe('指數退避策略', () => {
    it('應該使用指數退避策略增加重試延遲', async () => {
      shouldFailTimes = 3

      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
      })

      const startTime = Date.now()

      try {
        await client.connect({
          maxRetries: 3,
          retryDelayMs: 50,
          backoffMultiplier: 2,
        })
      } catch {
        // 預期會失敗
      }

      const totalTime = Date.now() - startTime

      // 計算預期延遲：50 + 100 + 200 = 350ms
      // 允許一些誤差（測試執行時間）
      expect(totalTime).toBeGreaterThanOrEqual(300)
      expect(totalTime).toBeLessThan(500)
    })

    it('應該支援自訂退避倍數', async () => {
      shouldFailTimes = 2

      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
      })

      const startTime = Date.now()

      try {
        await client.connect({
          maxRetries: 2,
          retryDelayMs: 20,
          backoffMultiplier: 3, // 使用 3 倍退避
        })
      } catch {
        // 預期會失敗
      }

      const totalTime = Date.now() - startTime

      // 計算預期延遲：20 + 60 = 80ms
      expect(totalTime).toBeGreaterThanOrEqual(70)
      expect(totalTime).toBeLessThan(150)
    })
  })

  describe('預設重試配置', () => {
    it('應該使用預設的重試配置', async () => {
      shouldFailTimes = 1

      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
      })

      // 不提供 retryConfig，應該使用預設值
      await client.connect()

      expect(connectAttempts).toBe(2)
      expect(client.isConnected()).toBe(true)
    })

    it('應該允許部分覆蓋預設配置', async () => {
      shouldFailTimes = 2

      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
      })

      await client.connect({
        maxRetries: 5, // 只覆蓋 maxRetries
        // retryDelayMs 和 backoffMultiplier 使用預設值
      })

      expect(connectAttempts).toBe(3)
      expect(client.isConnected()).toBe(true)
    })
  })

  describe('錯誤訊息處理', () => {
    it('應該在錯誤訊息中包含嘗試次數', async () => {
      shouldFailTimes = 3
      connectionErrors = ['Error 1', 'Error 2', 'Error 3']

      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
      })

      try {
        await client.connect({
          maxRetries: 2,
          retryDelayMs: 10,
        })
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('after 3 attempts')
        expect((error as Error).message).toContain('Error 3')
      }
    })

    it('應該保留最後一次錯誤的詳細資訊', async () => {
      shouldFailTimes = 4
      connectionErrors = [
        'Network timeout',
        'Connection refused',
        'DNS resolution failed',
        'Authentication failed',
      ]

      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
      })

      try {
        await client.connect({
          maxRetries: 3,
          retryDelayMs: 10,
        })
      } catch (error) {
        expect((error as Error).message).toContain('Authentication failed')
      }
    })
  })

  describe('不同錯誤類型處理', () => {
    it('應該重試暫時性網路錯誤', async () => {
      shouldFailTimes = 2
      connectionErrors = ['ECONNREFUSED', 'ETIMEDOUT', 'success']

      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
      })

      await client.connect({
        maxRetries: 3,
        retryDelayMs: 10,
      })

      expect(connectAttempts).toBe(3)
      expect(client.isConnected()).toBe(true)
    })

    it('應該在認證錯誤後仍然重試', async () => {
      // 注意：當前實現會重試所有錯誤，包括認證錯誤
      // 這可能不是理想行為，但這是測試當前實現
      shouldFailTimes = 1
      connectionErrors = ['Authentication failed', 'success']

      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
      })

      await client.connect({
        maxRetries: 2,
        retryDelayMs: 10,
      })

      expect(connectAttempts).toBe(2)
      expect(client.isConnected()).toBe(true)
    })
  })

  describe('連線狀態檢查', () => {
    it('應該在已連線時跳過重試邏輯', async () => {
      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
      })

      await client.connect()

      expect(connectAttempts).toBe(1)

      // 再次呼叫 connect
      await client.connect({
        maxRetries: 3,
        retryDelayMs: 10,
      })

      // 不應該有額外的連線嘗試
      expect(connectAttempts).toBe(1)
    })
  })

  describe('極端情況', () => {
    it('應該處理 maxRetries 為 0 的情況', async () => {
      shouldFailTimes = 1

      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
      })

      try {
        await client.connect({
          maxRetries: 0,
          retryDelayMs: 10,
        })
      } catch (error) {
        expect((error as Error).message).toContain('after 1 attempts')
      }

      expect(connectAttempts).toBe(1) // 只有初始嘗試，沒有重試
    })

    it('應該處理非常大的重試次數', async () => {
      shouldFailTimes = 2

      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
      })

      await client.connect({
        maxRetries: 100,
        retryDelayMs: 1,
      })

      expect(connectAttempts).toBe(3) // 即使 maxRetries 很大，也只需要 3 次
      expect(client.isConnected()).toBe(true)
    })
  })
})
