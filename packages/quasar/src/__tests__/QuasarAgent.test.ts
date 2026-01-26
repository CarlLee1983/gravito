import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { QuasarAgent } from '../QuasarAgent'
import { MockRedis } from './mock-redis'

describe('QuasarAgent', () => {
  let mockTransportRedis: any
  let mockMonitorRedis: any

  beforeEach(() => {
    mockTransportRedis = new MockRedis()
    mockMonitorRedis = new MockRedis()

    // Add status property to MockRedis for QuasarAgent.getStatus()
    ;(mockTransportRedis as any).status = 'ready'
    ;(mockMonitorRedis as any).status = 'ready'

    // Mock set for heartbeat
    mockTransportRedis.set = mock(() => Promise.resolve('OK'))
    // Mock connect/quit/options
    mockTransportRedis.connect = mock(() => Promise.resolve())
    mockTransportRedis.quit = mock(() => Promise.resolve())
    mockTransportRedis.options = { host: 'localhost', port: 6379 }

    mockMonitorRedis.connect = mock(() => Promise.resolve())
    mockMonitorRedis.quit = mock(() => Promise.resolve())
  })

  describe('constructor and configuration', () => {
    it('should initialize with provided transport client', () => {
      const agent = new QuasarAgent({
        service: 'test-service',
        transport: { client: mockTransportRedis },
      })
      const status = agent.getStatus()
      expect(status.service).toBe('test-service')
      expect(status.transport).toBe('ready')
    })

    it('should initialize with monitor client when provided', () => {
      const agent = new QuasarAgent({
        service: 'test-service',
        transport: { client: mockTransportRedis },
        monitor: { client: mockMonitorRedis },
      })
      const status = agent.getStatus()
      expect(status.monitor).toBe('ready')
    })

    it('should use default redis url when no transport provided', () => {
      const agent = new QuasarAgent({
        service: 'test-service',
      })
      expect(agent).toBeDefined()
    })
  })

  describe('lifecycle (start/stop)', () => {
    it('should connect to redis on start', async () => {
      const transportClient = new MockRedis()
      const monitorClient = new MockRedis()

      const transportSpy = spyOn(transportClient, 'connect').mockImplementation(() =>
        Promise.resolve()
      )
      const monitorSpy = spyOn(monitorClient, 'connect').mockImplementation(() => Promise.resolve())

      const agent = new QuasarAgent({
        service: 'test-service',
        transport: { client: transportClient as any },
        monitor: { client: monitorClient as any },
      })

      await agent.start()

      expect(transportSpy).toHaveBeenCalled()
      expect(monitorSpy).toHaveBeenCalled()

      await agent.stop()
    })

    it('should cleanup redis connections on stop', async () => {
      const agent = new QuasarAgent({
        service: 'test-service',
        transport: { client: mockTransportRedis },
      })

      await agent.start()
      await agent.stop()

      expect(mockTransportRedis.quit).toHaveBeenCalled()
    })

    it('should perform initial tick on start', async () => {
      const agent = new QuasarAgent({
        service: 'test-service',
        transport: { client: mockTransportRedis },
      })

      await agent.start()
      // Heartbeat set is called during tick
      expect(mockTransportRedis.set).toHaveBeenCalled()

      await agent.stop()
    })
  })

  describe('monitorQueue registration', () => {
    it('should warn when monitor not configured', () => {
      const consoleSpy = spyOn(console, 'warn').mockImplementation(() => {})
      const agent = new QuasarAgent({
        service: 'test-service',
        transport: { client: mockTransportRedis },
      })

      agent.monitorQueue('test-queue', 'bullmq')
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should register bullmq probe', async () => {
      const agent = new QuasarAgent({
        service: 'test-service',
        transport: { client: mockTransportRedis },
        monitor: { client: mockMonitorRedis },
      })

      agent.monitorQueue('test-queue', 'bullmq')
      // Indirectly verify by checking if tick calls pipeline on monitor redis
      mockMonitorRedis.pipeline = mock(() => ({
        hgetall: () => ({}),
        exec: () =>
          Promise.resolve([
            [null, {}],
            [null, 0],
            [null, 0],
            [null, 0],
            [null, 0],
          ]),
      }))

      await agent.start()
      // tick is called on start
      await agent.stop()
    })
  })

  describe('remote control', () => {
    it('should fail to enable before start (missing nodeId)', async () => {
      const agent = new QuasarAgent({
        service: 'test-service',
        transport: { client: mockTransportRedis },
        monitor: { client: mockMonitorRedis },
      })

      const enabled = await agent.enableRemoteControl()
      expect(enabled).toBe(false)
    })

    it('should fail to enable if monitor not configured', async () => {
      const agent = new QuasarAgent({
        service: 'test-service',
        transport: { client: mockTransportRedis },
      })

      await agent.start()
      const enabled = await agent.enableRemoteControl()
      expect(enabled).toBe(false)
      await agent.stop()
    })
  })
})
