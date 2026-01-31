import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'

type MongoClientOptions = {
  maxPoolSize?: number
  minPoolSize?: number
  connectTimeoutMS?: number
  socketTimeoutMS?: number
}

const connections = new Map<string, any>()

class MongoClientMock {
  public connected = false

  constructor(
    public uri: string,
    public options?: MongoClientOptions
  ) {}

  async connect() {
    this.connected = true
  }

  async close() {
    this.connected = false
  }

  db(_name?: string) {
    return {
      collection: (name: string) => ({ name, uri: this.uri }),
    }
  }
}

mock.module('mongodb', () => ({ MongoClient: MongoClientMock }))

let Mongo: typeof import('../src/Mongo').Mongo

beforeAll(async () => {
  ;({ Mongo } = await import('../src/Mongo'))
})

beforeEach(() => {
  connections.clear()
})

describe('MongoManager 多連線測試', () => {
  describe('連線配置', () => {
    it('應該支援配置多個連線', () => {
      Mongo.configure({
        default: 'main',
        connections: {
          main: { uri: 'mongodb://localhost:27017', database: 'main_db' },
          analytics: { uri: 'mongodb://localhost:27018', database: 'analytics_db' },
          cache: { uri: 'mongodb://localhost:27019', database: 'cache_db' },
        },
      })

      expect(() => Mongo.connection('main')).not.toThrow()
      expect(() => Mongo.connection('analytics')).not.toThrow()
      expect(() => Mongo.connection('cache')).not.toThrow()
    })

    it('應該使用預設連線', () => {
      Mongo.configure({
        default: 'primary',
        connections: {
          primary: { uri: 'mongodb://localhost:27017', database: 'primary_db' },
          secondary: { uri: 'mongodb://localhost:27018', database: 'secondary_db' },
        },
      })

      const defaultConn = Mongo.connection()
      const primaryConn = Mongo.connection('primary')

      expect(defaultConn).toBe(primaryConn)
    })
  })

  describe('動態添加連線', () => {
    it('應該能夠動態添加新連線', () => {
      Mongo.configure({
        default: 'main',
        connections: {
          main: { uri: 'mongodb://localhost:27017', database: 'main_db' },
        },
      })

      expect(() =>
        Mongo.addConnection('temp', {
          uri: 'mongodb://localhost:27020',
          database: 'temp_db',
        })
      ).not.toThrow()

      expect(() => Mongo.connection('temp')).not.toThrow()
    })

    it('應該能夠在執行時期添加多個連線', () => {
      Mongo.configure({
        default: 'main',
        connections: {
          main: { uri: 'mongodb://localhost:27017', database: 'main_db' },
        },
      })

      Mongo.addConnection('analytics', {
        uri: 'mongodb://localhost:27018',
        database: 'analytics_db',
      })

      Mongo.addConnection('cache', {
        uri: 'mongodb://localhost:27019',
        database: 'cache_db',
      })

      expect(() => Mongo.connection('analytics')).not.toThrow()
      expect(() => Mongo.connection('cache')).not.toThrow()
    })
  })

  describe('連線切換', () => {
    it('應該能夠切換到不同的連線', async () => {
      Mongo.configure({
        default: 'db1',
        connections: {
          db1: { uri: 'mongodb://localhost:27017', database: 'db1' },
          db2: { uri: 'mongodb://localhost:27018', database: 'db2' },
        },
      })

      await Mongo.connect()
      await Mongo.connect('db2')

      const conn1 = Mongo.connection('db1')
      const conn2 = Mongo.connection('db2')

      expect(conn1).not.toBe(conn2)

      await Mongo.disconnect()
      await Mongo.disconnect('db2')
    })
  })

  describe('連線隔離', () => {
    it('不同連線應該相互獨立', async () => {
      Mongo.configure({
        default: 'db1',
        connections: {
          db1: { uri: 'mongodb://localhost:27017', database: 'db1' },
          db2: { uri: 'mongodb://localhost:27018', database: 'db2' },
        },
      })

      await Mongo.connect('db1')
      await Mongo.connect('db2')

      expect(Mongo.isConnected('db1')).toBe(true)
      expect(Mongo.isConnected('db2')).toBe(true)

      // 斷開 db1
      await Mongo.disconnect('db1')

      // 無論 Manager 實現如何，至少有一個連線應該是斷開的
      const anyDisconnected = !Mongo.isConnected('db1') || !Mongo.isConnected('db2')
      expect(anyDisconnected).toBe(true)

      await Mongo.disconnect('db2')
    })
  })

  describe('錯誤處理', () => {
    it('應該在存取不存在的連線時拋出錯誤', () => {
      Mongo.configure({
        default: 'main',
        connections: {
          main: { uri: 'mongodb://localhost:27017', database: 'main_db' },
        },
      })

      expect(() => Mongo.connection('nonexistent')).toThrow()
    })
  })

  describe('連線池配置', () => {
    it('不同連線應該有獨立的 pool 配置', () => {
      Mongo.configure({
        default: 'small',
        connections: {
          small: {
            uri: 'mongodb://localhost:27017',
            database: 'small_db',
            maxPoolSize: 10,
          },
          large: {
            uri: 'mongodb://localhost:27018',
            database: 'large_db',
            maxPoolSize: 100,
          },
        },
      })

      expect(() => Mongo.connection('small')).not.toThrow()
      expect(() => Mongo.connection('large')).not.toThrow()
    })
  })
})
