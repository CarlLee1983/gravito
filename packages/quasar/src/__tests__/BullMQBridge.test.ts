import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { BullMQBridge } from '../bridges/BullMQBridge'
import { MockRedis } from './mock-redis'

describe('BullMQBridge', () => {
  let redis: any
  let mockWorker: any
  let publishSpy: any

  beforeEach(() => {
    redis = new MockRedis()
    publishSpy = mock(() => Promise.resolve(1))
    redis.publish = publishSpy

    // Mock BullMQ Worker
    mockWorker = {
      on: mock((_event: string, _handler: Function) => {}),
      off: mock((_event: string, _handler: Function) => {}),
    }
  })

  afterEach(async () => {
    // No cleanup needed
  })

  it('should attach to worker and register event listeners', () => {
    const bridge = new BullMQBridge(redis, 'flux_console:', 'test-worker')
    bridge.attach(mockWorker)

    // Verify that event listeners were registered
    expect(mockWorker.on).toHaveBeenCalledTimes(4)
    expect(mockWorker.on).toHaveBeenCalledWith('active', expect.any(Function))
    expect(mockWorker.on).toHaveBeenCalledWith('completed', expect.any(Function))
    expect(mockWorker.on).toHaveBeenCalledWith('failed', expect.any(Function))
    expect(mockWorker.on).toHaveBeenCalledWith('progress', expect.any(Function))
  })

  it('should publish log when job becomes active', async () => {
    // Disable batching for test
    const bridge = new BullMQBridge(redis, 'flux_console:', 'test-worker', {
      batchSize: 1,
      flushInterval: 1000,
    })
    bridge.attach(mockWorker)

    // Get the 'active' event handler
    const activeHandler = mockWorker.on.mock.calls.find((call: any) => call[0] === 'active')?.[1]
    expect(activeHandler).toBeDefined()

    // Trigger the event
    const mockJob = { id: 'job-123', name: 'sendEmail', data: { to: 'test@example.com' } }
    await activeHandler(mockJob)

    // Verify Redis publish was called
    expect(publishSpy).toHaveBeenCalled()
    const publishCall = publishSpy.mock.calls[0]
    expect(publishCall[0]).toBe('flux_console:logs')

    const payload = JSON.parse(publishCall[1])
    expect(payload.level).toBe('info')
    expect(payload.jobId).toBe('job-123')
    expect(payload.message).toContain('sendEmail')
  })

  it('should publish error log when job fails', async () => {
    // Disable batching for test
    const bridge = new BullMQBridge(redis, 'flux_console:', 'test-worker', {
      batchSize: 1,
      flushInterval: 1000,
    })
    bridge.attach(mockWorker)

    // Get the 'failed' event handler
    const failedHandler = mockWorker.on.mock.calls.find((call: any) => call[0] === 'failed')?.[1]
    expect(failedHandler).toBeDefined()

    // Trigger the event
    const mockJob = { id: 'job-456', name: 'sendEmail' }
    const mockError = new Error('SMTP connection failed')
    await failedHandler(mockJob, mockError)

    // Verify Redis publish was called
    expect(publishSpy).toHaveBeenCalled()
    const publishCall = publishSpy.mock.calls[0]
    const payload = JSON.parse(publishCall[1])

    expect(payload.level).toBe('error')
    expect(payload.jobId).toBe('job-456')
    expect(payload.context.error).toBe('SMTP connection failed')
    expect(payload.context.stack).toBeDefined()
  })

  it('should detach all event listeners', () => {
    const bridge = new BullMQBridge(redis, 'flux_console:', 'test-worker')
    bridge.attach(mockWorker)

    bridge.detach()

    // Verify that event listeners were removed
    expect(mockWorker.off).toHaveBeenCalledTimes(4)
  })
})
