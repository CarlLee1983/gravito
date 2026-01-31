import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { QuasarAgent } from '../../QuasarAgent'
import { createMockRedis } from '../helpers/mocks'

describe('Integration: Remote Control Flow', () => {
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
    })
    await agent.start()

    // Remote control requires nodeId which is set after first tick (called in start)
    await agent.enableRemoteControl()
  })

  afterEach(async () => {
    await agent.stop()
  })

  it('should execute command when received via redis pub/sub', async () => {
    const nodeId = agent.getNodeId()
    expect(nodeId).toBeDefined()

    // Add job to mock redis so delete can find it
    await mockMonitor.lpush('email-queue:failed', 'job-123')

    const lremSpy = spyOn(mockMonitor, 'lrem')

    // Simulate Zenith sending a command
    const command = {
      id: 'cmd-1',
      type: 'DELETE_JOB',
      targetNodeId: nodeId,
      payload: {
        queue: 'email-queue',
        jobKey: 'job-123',
      },
    }

    const channel = `gravito:quasar:cmd:test-service:${nodeId}`

    // Trigger message on the transport redis (since we're using it as subscriber in mock mode)
    mockTransport.emitMessage(channel, JSON.stringify(command))

    // Give it a tiny bit of time to handle the command
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Verify DeleteJobExecutor was called (it calls redis.lrem internally)
    expect(lremSpy).toHaveBeenCalled()
  })
})
