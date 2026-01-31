import { beforeEach, describe, expect, it, mock } from 'bun:test'

type MongoClientOptions = {
  maxPoolSize?: number
  minPoolSize?: number
  connectTimeoutMS?: number
  socketTimeoutMS?: number
}

let shouldThrowError = false
let errorType = 'NetworkError'

class MongoClientMock {
  constructor(
    public uri: string,
    public options?: MongoClientOptions
  ) {}

  async connect() {
    if (shouldThrowError) {
      switch (errorType) {
        case 'NetworkError':
          throw new Error('ECONNREFUSED: Connection refused')
        case 'AuthError':
          throw new Error('Authentication failed')
        case 'InvalidURI':
          throw new Error('Invalid connection string')
        case 'Timeout':
          throw new Error('ETIMEDOUT: Connection timeout')
        default:
          throw new Error('Unknown error')
      }
    }
  }

  async close() {}

  db(_name?: string) {
    return {
      collection: (name: string) => ({ name }),
      command: async (_cmd: any) => {
        if (shouldThrowError) {
          throw new Error('Command failed')
        }
        return { ok: 1 }
      },
    }
  }
}

mock.module('mongodb', () => ({ MongoClient: MongoClientMock }))

let MongoClient: typeof import('../src/MongoClient').MongoClient

describe('MongoClient 錯誤處理測試', () => {
  beforeEach(async () => {
    const module = await import('../src/MongoClient')
    MongoClient = module.MongoClient
    shouldThrowError = false
    errorType = 'NetworkError'
  })

  describe('連線錯誤處理', () => {
    it('應該處理網路連線錯誤', async () => {
      shouldThrowError = true
      errorType = 'NetworkError'

      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
      })

      await expect(client.connect({ maxRetries: 0, retryDelayMs: 10 })).rejects.toThrow(
        /ECONNREFUSED/
      )

      expect(client.isConnected()).toBe(false)
    })

    it('應該處理認證錯誤', async () => {
      shouldThrowError = true
      errorType = 'AuthError'

      const client = new MongoClient({
        uri: 'mongodb://user:wrong@localhost:27017',
        database: 'test',
      })

      await expect(client.connect({ maxRetries: 0, retryDelayMs: 10 })).rejects.toThrow(
        /Authentication/
      )

      expect(client.isConnected()).toBe(false)
    })

    it('應該處理無效的 URI', async () => {
      shouldThrowError = true
      errorType = 'InvalidURI'

      const client = new MongoClient({
        uri: 'invalid://uri',
        database: 'test',
      })

      await expect(client.connect({ maxRetries: 0, retryDelayMs: 10 })).rejects.toThrow(/Invalid/)

      expect(client.isConnected()).toBe(false)
    })

    it('應該處理連線超時', async () => {
      shouldThrowError = true
      errorType = 'Timeout'

      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
        connectTimeoutMS: 1000,
      })

      await expect(client.connect({ maxRetries: 0, retryDelayMs: 10 })).rejects.toThrow(/ETIMEDOUT/)

      expect(client.isConnected()).toBe(false)
    })
  })

  describe('錯誤後的狀態管理', () => {
    it('連線失敗後應該保持未連線狀態', async () => {
      shouldThrowError = true

      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
      })

      try {
        await client.connect({ maxRetries: 0, retryDelayMs: 10 })
      } catch {
        // 預期錯誤
      }

      expect(client.isConnected()).toBe(false)
    })

    it('連線失敗後應該能夠重新連線', async () => {
      shouldThrowError = true

      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
      })

      try {
        await client.connect({ maxRetries: 0, retryDelayMs: 10 })
      } catch {
        // 預期錯誤
      }

      // 現在允許連線成功
      shouldThrowError = false

      await client.connect()

      expect(client.isConnected()).toBe(true)

      await client.disconnect()
    })
  })

  describe('ensureConnected 錯誤處理', () => {
    it('應該在未連線時嘗試連線', async () => {
      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
      })

      // 未連線時呼叫 ensureConnected
      await client.ensureConnected()

      expect(client.isConnected()).toBe(true)

      await client.disconnect()
    })
  })

  describe('disconnect 錯誤處理', () => {
    it('應該正常處理已經斷線的情況', async () => {
      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
      })

      // 未連線時 disconnect 應該不拋出錯誤
      await client.disconnect()

      expect(client.isConnected()).toBe(false)
    })

    it('應該能夠多次呼叫 disconnect', async () => {
      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
      })

      await client.connect()
      await client.disconnect()

      // 再次 disconnect 應該不拋出錯誤
      await client.disconnect()

      expect(client.isConnected()).toBe(false)
    })
  })
})
