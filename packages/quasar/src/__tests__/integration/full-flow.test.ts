import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { QuasarAgent } from '../../QuasarAgent'
import { createMockRedis } from '../helpers/mocks'

describe('Integration: Full Monitoring Flow', () => {
  let agent: QuasarAgent
  let mockTransport: any
  let mockMonitor: any

  beforeEach(async () => {
    mockTransport = createMockRedis()
    mockMonitor = createMockRedis()

    agent = new QuasarAgent({
      service: 'test-service',
      transport: { client: mockTransport },
      monitor: { client: mockMonitor },
      interval: 50,
    })
  })

  afterEach(async () => {
    await agent.stop()
  })

  it('should publish heartbeat to redis', async () => {
    await agent.start()

    await new Promise((resolve) => setTimeout(resolve, 100))

    const store = mockTransport.getStore()
    const keys = Array.from(store.keys())

    const heartbeatKey = keys.find((k: string) => k.startsWith('gravito:quasar:node:test-service'))
    expect(heartbeatKey).toBeDefined()

    if (heartbeatKey) {
      const data = JSON.parse(store.get(heartbeatKey)!)
      expect(data.service).toBe('test-service')
      expect(data.pid).toBeDefined()
    }
  })
})
