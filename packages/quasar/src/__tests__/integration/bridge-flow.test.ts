import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { QuasarAgent } from '../../QuasarAgent'
import { createMockRedis, createMockWorker } from '../helpers/mocks'

describe('Integration: Bridge Event Flow', () => {
  let agent: QuasarAgent
  let mockTransport: any

  beforeEach(async () => {
    mockTransport = createMockRedis()

    agent = new QuasarAgent({
      service: 'test-service',
      transport: { client: mockTransport },
    })
    await agent.start()
  })

  afterEach(async () => {
    await agent.stop()
  })

  it('should capture job events and buffer them into redis logs', async () => {
    const worker = createMockWorker('email-queue')

    // Attach BullMQ bridge (uses worker events)
    agent.attachBridge(worker, 'bullmq')

    // Simulate job events
    const job = { id: '123', data: { to: 'user@example.com' }, queueName: 'email-queue' }

    // BullMQ bridge listens for 'completed', 'failed', 'progress'
    worker.emit('completed', job, { success: true })
    worker.emit('progress', job, 50)

    // Bridge uses LogBuffer which batches and flushes periodically (default 1000ms)
    // For test, we wait a bit longer than flush interval
    await new Promise((resolve) => setTimeout(resolve, 1100))

    const lists = mockTransport.getLists()
    // Zenith log key format: {prefix}logs:history
    // QUASAR_KEYS.ZENITH_LOG_PREFIX = 'flux_console:'
    const logKey = 'flux_console:logs:history'
    const logs = lists.get(logKey)

    expect(logs).toBeDefined()
    expect(logs?.length).toBeGreaterThan(0)

    const lastLog = JSON.parse(logs![0])
    expect(lastLog.workerId).toBeDefined()
    expect(['success', 'info']).toContain(lastLog.level)
  })
})
