import { beforeAll, beforeEach, describe, expect, it } from 'bun:test'

// 模擬 MongoDB Pool 結構
class MockPool {
  constructor(
    public totalConnectionCount = 0,
    public availableConnectionCount = 0,
    public waitQueueSize = 0,
    public currentCheckedOutCount = 0
  ) {}
}

class MockServer {
  constructor(public pool: MockPool | null = null) {}
}

class MockTopology {
  public s: { servers: Map<string, MockServer> }

  constructor() {
    this.s = { servers: new Map() }
  }

  addServer(id: string, pool: MockPool | null) {
    this.s.servers.set(id, new MockServer(pool))
  }
}

class MockMongoClient {
  public client: { topology: MockTopology | null }

  constructor(topology: MockTopology | null = null) {
    this.client = { topology }
  }
}

let MongoPoolMonitor: typeof import('../src/MongoPoolMetrics').MongoPoolMonitor

beforeAll(async () => {
  ;({ MongoPoolMonitor } = await import('../src/MongoPoolMetrics'))
})

describe('MongoPoolMonitor', () => {
  describe('基本指標讀取', () => {
    it('應該正確讀取單一 server 的連線池指標', () => {
      const topology = new MockTopology()
      topology.addServer('server1', new MockPool(10, 8, 0, 2))

      const mockClient = new MockMongoClient(topology) as any
      const monitor = new MongoPoolMonitor(mockClient)

      const metrics = monitor.getMetrics()

      expect(metrics).not.toBeNull()
      expect(metrics?.totalConnections).toBe(10)
      expect(metrics?.availableConnections).toBe(8)
      expect(metrics?.waitQueueSize).toBe(0)
      expect(metrics?.currentCheckedOutCount).toBe(2)
    })

    it('應該正確聚合多個 server 的指標', () => {
      const topology = new MockTopology()
      topology.addServer('server1', new MockPool(10, 8, 0, 2))
      topology.addServer('server2', new MockPool(15, 12, 1, 3))
      topology.addServer('server3', new MockPool(20, 15, 2, 5))

      const mockClient = new MockMongoClient(topology) as any
      const monitor = new MongoPoolMonitor(mockClient)

      const metrics = monitor.getMetrics()

      expect(metrics).not.toBeNull()
      expect(metrics?.totalConnections).toBe(45) // 10 + 15 + 20
      expect(metrics?.availableConnections).toBe(35) // 8 + 12 + 15
      expect(metrics?.waitQueueSize).toBe(3) // 0 + 1 + 2
      expect(metrics?.currentCheckedOutCount).toBe(10) // 2 + 3 + 5
    })

    it('應該正確處理連線池狀態變化', () => {
      const topology = new MockTopology()
      const pool = new MockPool(10, 10, 0, 0)
      topology.addServer('server1', pool)

      const mockClient = new MockMongoClient(topology) as any
      const monitor = new MongoPoolMonitor(mockClient)

      // 初始狀態：所有連線可用
      let metrics = monitor.getMetrics()
      expect(metrics?.availableConnections).toBe(10)
      expect(metrics?.currentCheckedOutCount).toBe(0)

      // 模擬連線被使用
      pool.availableConnectionCount = 7
      pool.currentCheckedOutCount = 3

      metrics = monitor.getMetrics()
      expect(metrics?.availableConnections).toBe(7)
      expect(metrics?.currentCheckedOutCount).toBe(3)
    })

    it('應該正確處理等待佇列大小', () => {
      const topology = new MockTopology()
      const pool = new MockPool(10, 0, 5, 10) // 所有連線已用完，5 個請求在等待
      topology.addServer('server1', pool)

      const mockClient = new MockMongoClient(topology) as any
      const monitor = new MongoPoolMonitor(mockClient)

      const metrics = monitor.getMetrics()

      expect(metrics?.totalConnections).toBe(10)
      expect(metrics?.availableConnections).toBe(0)
      expect(metrics?.waitQueueSize).toBe(5)
      expect(metrics?.currentCheckedOutCount).toBe(10)
    })
  })

  describe('未連線或錯誤狀態處理', () => {
    it('當客戶端未連線時應該返回 null', () => {
      const mockClient = new MockMongoClient(null) as any
      const monitor = new MongoPoolMonitor(mockClient)

      const metrics = monitor.getMetrics()

      expect(metrics).toBeNull()
    })

    it('當 topology 不存在時應該返回 null', () => {
      const mockClient = { client: null } as any
      const monitor = new MongoPoolMonitor(mockClient)

      const metrics = monitor.getMetrics()

      expect(metrics).toBeNull()
    })

    it('當 nativeClient 不存在時應該返回 null', () => {
      const mockClient = {} as any
      const monitor = new MongoPoolMonitor(mockClient)

      const metrics = monitor.getMetrics()

      expect(metrics).toBeNull()
    })
  })

  describe('邊界情況處理', () => {
    it('應該正確處理空的 server 列表', () => {
      const topology = new MockTopology()
      // 不添加任何 server

      const mockClient = new MockMongoClient(topology) as any
      const monitor = new MongoPoolMonitor(mockClient)

      const metrics = monitor.getMetrics()

      expect(metrics).not.toBeNull()
      expect(metrics?.totalConnections).toBe(0)
      expect(metrics?.availableConnections).toBe(0)
      expect(metrics?.waitQueueSize).toBe(0)
      expect(metrics?.currentCheckedOutCount).toBe(0)
    })

    it('應該正確處理沒有 pool 的 server', () => {
      const topology = new MockTopology()
      topology.addServer('server1', new MockPool(10, 8, 0, 2))
      topology.addServer('server2', null) // server 沒有 pool
      topology.addServer('server3', new MockPool(5, 3, 0, 2))

      const mockClient = new MockMongoClient(topology) as any
      const monitor = new MongoPoolMonitor(mockClient)

      const metrics = monitor.getMetrics()

      expect(metrics).not.toBeNull()
      // 應該只計算有 pool 的 server
      expect(metrics?.totalConnections).toBe(15) // 10 + 5
      expect(metrics?.availableConnections).toBe(11) // 8 + 3
      expect(metrics?.currentCheckedOutCount).toBe(4) // 2 + 2
    })

    it('應該正確處理 pool 屬性為 undefined 的情況', () => {
      const topology = new MockTopology()
      const pool1 = new MockPool()
      // 模擬某些屬性可能是 undefined
      pool1.totalConnectionCount = undefined as any
      pool1.availableConnectionCount = undefined as any
      pool1.waitQueueSize = undefined as any
      pool1.currentCheckedOutCount = undefined as any

      topology.addServer('server1', pool1)
      topology.addServer('server2', new MockPool(10, 8, 0, 2))

      const mockClient = new MockMongoClient(topology) as any
      const monitor = new MongoPoolMonitor(mockClient)

      const metrics = monitor.getMetrics()

      expect(metrics).not.toBeNull()
      // undefined 應該被當作 0 處理
      expect(metrics?.totalConnections).toBe(10)
      expect(metrics?.availableConnections).toBe(8)
      expect(metrics?.waitQueueSize).toBe(0)
      expect(metrics?.currentCheckedOutCount).toBe(2)
    })

    it('應該正確處理 pool 屬性為 null 的情況', () => {
      const topology = new MockTopology()
      const pool1 = new MockPool()
      pool1.totalConnectionCount = null as any
      pool1.availableConnectionCount = null as any
      pool1.waitQueueSize = null as any
      pool1.currentCheckedOutCount = null as any

      topology.addServer('server1', pool1)
      topology.addServer('server2', new MockPool(5, 3, 0, 2))

      const mockClient = new MockMongoClient(topology) as any
      const monitor = new MongoPoolMonitor(mockClient)

      const metrics = monitor.getMetrics()

      expect(metrics).not.toBeNull()
      // null 應該被當作 0 處理（使用 ?? 0 運算子）
      expect(metrics?.totalConnections).toBe(5)
      expect(metrics?.availableConnections).toBe(3)
      expect(metrics?.waitQueueSize).toBe(0)
      expect(metrics?.currentCheckedOutCount).toBe(2)
    })
  })

  describe('實際使用場景模擬', () => {
    it('應該能夠監控連線洩漏情況', () => {
      const topology = new MockTopology()
      const pool = new MockPool(10, 2, 0, 8)

      topology.addServer('server1', pool)

      const mockClient = new MockMongoClient(topology) as any
      const monitor = new MongoPoolMonitor(mockClient)

      const metrics = monitor.getMetrics()

      expect(metrics).not.toBeNull()
      // 8 個連線被 checkout，只剩 2 個可用 - 可能有連線洩漏
      const utilizationRate = (metrics!.currentCheckedOutCount / metrics!.totalConnections) * 100
      expect(utilizationRate).toBe(80) // 80% 使用率
    })

    it('應該能夠檢測連線池耗盡情況', () => {
      const topology = new MockTopology()
      const pool = new MockPool(10, 0, 15, 10) // 池已滿，15 個請求在等待

      topology.addServer('server1', pool)

      const mockClient = new MockMongoClient(topology) as any
      const monitor = new MongoPoolMonitor(mockClient)

      const metrics = monitor.getMetrics()

      expect(metrics).not.toBeNull()
      expect(metrics?.availableConnections).toBe(0)
      expect(metrics?.currentCheckedOutCount).toBe(10)
      expect(metrics?.waitQueueSize).toBeGreaterThan(0)
      // 這種情況表示需要增加 maxPoolSize 或優化查詢
    })
  })
})
