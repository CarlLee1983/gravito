import { beforeEach, describe, expect, it, mock } from 'bun:test'

type MongoClientOptions = {
  maxPoolSize?: number
  minPoolSize?: number
  connectTimeoutMS?: number
  socketTimeoutMS?: number
}

class MockPool {
  constructor(
    public totalConnectionCount = 0,
    public availableConnectionCount = 0
  ) {}
}

class MockServer {
  constructor(public pool: MockPool) {}
}

class MockTopology {
  public s: { servers: Map<string, MockServer> }

  constructor(poolSize: number) {
    this.s = { servers: new Map() }
    this.s.servers.set('server1', new MockServer(new MockPool(poolSize, poolSize)))
  }
}

class MongoClientMock {
  public topology: MockTopology | null = null

  constructor(
    public uri: string,
    public options?: MongoClientOptions
  ) {}

  async connect() {
    const maxPoolSize = this.options?.maxPoolSize ?? 10
    this.topology = new MockTopology(maxPoolSize)
  }

  async close() {
    this.topology = null
  }

  db(_name?: string) {
    return {
      collection: (name: string) => ({ name }),
    }
  }
}

mock.module('mongodb', () => ({ MongoClient: MongoClientMock }))

let MongoClient: typeof import('../src/MongoClient').MongoClient
let MongoPoolMonitor: typeof import('../src/MongoPoolMetrics').MongoPoolMonitor

describe('MongoClient 連線池測試', () => {
  beforeEach(async () => {
    const clientModule = await import('../src/MongoClient')
    const monitorModule = await import('../src/MongoPoolMetrics')
    MongoClient = clientModule.MongoClient
    MongoPoolMonitor = monitorModule.MongoPoolMonitor
  })

  describe('maxPoolSize 和 minPoolSize 設定', () => {
    it('應該使用預設的 pool 大小', async () => {
      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
      })

      await client.connect()

      // 驗證預設值
      const nativeClient = (client as any).client
      expect(nativeClient.options?.maxPoolSize).toBe(10)
      expect(nativeClient.options?.minPoolSize).toBe(1)

      await client.disconnect()
    })

    it('應該使用自訂的 maxPoolSize', async () => {
      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
        maxPoolSize: 50,
      })

      await client.connect()

      const nativeClient = (client as any).client
      expect(nativeClient.options?.maxPoolSize).toBe(50)

      await client.disconnect()
    })

    it('應該使用自訂的 minPoolSize', async () => {
      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
        minPoolSize: 5,
      })

      await client.connect()

      const nativeClient = (client as any).client
      expect(nativeClient.options?.minPoolSize).toBe(5)

      await client.disconnect()
    })

    it('應該同時設定 maxPoolSize 和 minPoolSize', async () => {
      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
        maxPoolSize: 100,
        minPoolSize: 10,
      })

      await client.connect()

      const nativeClient = (client as any).client
      expect(nativeClient.options?.maxPoolSize).toBe(100)
      expect(nativeClient.options?.minPoolSize).toBe(10)

      await client.disconnect()
    })
  })

  describe('連線池監控', () => {
    it('應該能夠監控連線池大小', async () => {
      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
        maxPoolSize: 20,
      })

      await client.connect()

      const monitor = new MongoPoolMonitor(client as any)
      const metrics = monitor.getMetrics()

      expect(metrics).not.toBeNull()
      expect(metrics?.totalConnections).toBe(20)

      await client.disconnect()
    })

    it('應該反映不同的 pool 大小配置', async () => {
      const client1 = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
        maxPoolSize: 10,
      })

      const client2 = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
        maxPoolSize: 50,
      })

      await client1.connect()
      await client2.connect()

      const monitor1 = new MongoPoolMonitor(client1 as any)
      const monitor2 = new MongoPoolMonitor(client2 as any)

      const metrics1 = monitor1.getMetrics()
      const metrics2 = monitor2.getMetrics()

      expect(metrics1?.totalConnections).toBe(10)
      expect(metrics2?.totalConnections).toBe(50)

      await client1.disconnect()
      await client2.disconnect()
    })
  })

  describe('連線超時設定', () => {
    it('應該設定 connectTimeoutMS', async () => {
      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
        connectTimeoutMS: 5000,
      })

      await client.connect()

      const nativeClient = (client as any).client
      expect(nativeClient.options?.connectTimeoutMS).toBe(5000)

      await client.disconnect()
    })

    it('應該設定 socketTimeoutMS', async () => {
      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
        socketTimeoutMS: 10000,
      })

      await client.connect()

      const nativeClient = (client as any).client
      expect(nativeClient.options?.socketTimeoutMS).toBe(10000)

      await client.disconnect()
    })
  })

  describe('極端 pool 大小', () => {
    it('應該處理最小 pool 大小 (1)', async () => {
      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
        maxPoolSize: 1,
        minPoolSize: 1,
      })

      await client.connect()

      const monitor = new MongoPoolMonitor(client as any)
      const metrics = monitor.getMetrics()

      expect(metrics?.totalConnections).toBe(1)

      await client.disconnect()
    })

    it('應該處理大型 pool 大小', async () => {
      const client = new MongoClient({
        uri: 'mongodb://localhost:27017',
        database: 'test',
        maxPoolSize: 1000,
      })

      await client.connect()

      const monitor = new MongoPoolMonitor(client as any)
      const metrics = monitor.getMetrics()

      expect(metrics?.totalConnections).toBe(1000)

      await client.disconnect()
    })
  })
})
