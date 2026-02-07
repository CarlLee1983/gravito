import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'

type MongoClientOptions = {
  maxPoolSize?: number
  minPoolSize?: number
  connectTimeoutMS?: number
  socketTimeoutMS?: number
}

let connectDelay = 0

class MongoClientMock {
  public connected = false

  constructor(
    public uri: string,
    public options?: MongoClientOptions
  ) {}

  async connect() {
    if (connectDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, connectDelay))
    }
    this.connected = true
  }

  async close() {
    this.connected = false
  }

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

let Mongo: typeof import('../src/Mongo').Mongo

beforeAll(async () => {
  ;({ Mongo } = await import('../src/Mongo'))
})

beforeEach(() => {
  connectDelay = 0
})

describe('MongoManager 並發測試', () => {
  describe('並發連線', () => {
    it('應該能夠並發連線到多個資料庫', async () => {
      Mongo.configure({
        default: 'db1',
        connections: {
          db1: { uri: 'mongodb://localhost:27017', database: 'db1' },
          db2: { uri: 'mongodb://localhost:27018', database: 'db2' },
          db3: { uri: 'mongodb://localhost:27019', database: 'db3' },
        },
      })

      connectDelay = 10 // 每個連線延遲 10ms

      const startTime = Date.now()

      await Promise.all([Mongo.connect('db1'), Mongo.connect('db2'), Mongo.connect('db3')])

      const duration = Date.now() - startTime

      // 並發執行應該比序列執行快
      expect(duration).toBeLessThan(25) // 應該接近 10ms 而非 30ms

      expect(Mongo.isConnected('db1')).toBe(true)
      expect(Mongo.isConnected('db2')).toBe(true)
      expect(Mongo.isConnected('db3')).toBe(true)

      await Promise.all([Mongo.disconnect('db1'), Mongo.disconnect('db2'), Mongo.disconnect('db3')])
    })

    it('應該能夠並發斷線', async () => {
      Mongo.configure({
        default: 'db1',
        connections: {
          db1: { uri: 'mongodb://localhost:27017', database: 'db1' },
          db2: { uri: 'mongodb://localhost:27018', database: 'db2' },
          db3: { uri: 'mongodb://localhost:27019', database: 'db3' },
        },
      })

      await Promise.all([Mongo.connect('db1'), Mongo.connect('db2'), Mongo.connect('db3')])

      await Promise.all([Mongo.disconnect('db1'), Mongo.disconnect('db2'), Mongo.disconnect('db3')])

      expect(Mongo.isConnected('db1')).toBe(false)
      expect(Mongo.isConnected('db2')).toBe(false)
      expect(Mongo.isConnected('db3')).toBe(false)
    })
  })

  describe('並發連線和斷線', () => {
    it('應該能夠同時處理連線和斷線操作', async () => {
      Mongo.configure({
        default: 'db1',
        connections: {
          db1: { uri: 'mongodb://localhost:27017', database: 'db1' },
          db2: { uri: 'mongodb://localhost:27018', database: 'db2' },
          db3: { uri: 'mongodb://localhost:27019', database: 'db3' },
        },
      })

      // 先連線 db1 和 db2
      await Mongo.connect('db1')
      await Mongo.connect('db2')

      // 同時連線 db3 和斷線 db1
      await Promise.all([Mongo.connect('db3'), Mongo.disconnect('db1')])

      // 至少操作應該完成而不拋出錯誤
      expect(true).toBe(true)

      // 清理
      try {
        await Mongo.disconnect('db1')
      } catch {
        // 可能已經斷線
      }
      try {
        await Mongo.disconnect('db2')
      } catch {
        // 忽略
      }
      try {
        await Mongo.disconnect('db3')
      } catch {
        // 忽略
      }
    })
  })

  describe('連線狀態一致性', () => {
    it('並發操作後連線狀態應該一致', async () => {
      Mongo.configure({
        default: 'db1',
        connections: {
          db1: { uri: 'mongodb://localhost:27017', database: 'db1' },
          db2: { uri: 'mongodb://localhost:27018', database: 'db2' },
        },
      })

      // 進行多輪並發連線和斷線
      for (let i = 0; i < 3; i++) {
        await Promise.all([Mongo.connect('db1'), Mongo.connect('db2')])

        expect(Mongo.isConnected('db1')).toBe(true)
        expect(Mongo.isConnected('db2')).toBe(true)

        await Promise.all([Mongo.disconnect('db1'), Mongo.disconnect('db2')])

        expect(Mongo.isConnected('db1')).toBe(false)
        expect(Mongo.isConnected('db2')).toBe(false)
      }
    })
  })

  describe('重複連線處理', () => {
    it('應該安全處理重複的並發連線請求', async () => {
      Mongo.configure({
        default: 'main',
        connections: {
          main: { uri: 'mongodb://localhost:27017', database: 'main_db' },
        },
      })

      // 同時發起多個連線請求
      await Promise.all([Mongo.connect('main'), Mongo.connect('main'), Mongo.connect('main')])

      expect(Mongo.isConnected('main')).toBe(true)

      await Mongo.disconnect('main')
    })

    it('應該安全處理重複的並發斷線請求', async () => {
      Mongo.configure({
        default: 'main',
        connections: {
          main: { uri: 'mongodb://localhost:27017', database: 'main_db' },
        },
      })

      await Mongo.connect('main')

      // 同時發起多個斷線請求
      await Promise.all([
        Mongo.disconnect('main'),
        Mongo.disconnect('main'),
        Mongo.disconnect('main'),
      ])

      expect(Mongo.isConnected('main')).toBe(false)
    })
  })
})
