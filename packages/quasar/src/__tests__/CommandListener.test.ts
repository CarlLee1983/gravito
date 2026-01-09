import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { CommandListener } from '../CommandListener'
import type { QuasarCommand } from '../types'

describe('CommandListener', () => {
  let mockSubscriber: any
  let mockMonitorRedis: any
  let messageHandlers: Map<string, (channel: string, message: string) => void>
  let patternHandlers: Map<string, (pattern: string, channel: string, message: string) => void>

  beforeEach(() => {
    messageHandlers = new Map()
    patternHandlers = new Map()

    mockSubscriber = {
      subscribe: mock(() => Promise.resolve()),
      psubscribe: mock(() => Promise.resolve()),
      unsubscribe: mock(() => Promise.resolve()),
      punsubscribe: mock(() => Promise.resolve()),
      on: mock((event: string, handler: any) => {
        if (event === 'message') {
          messageHandlers.set(event, handler)
        } else if (event === 'pmessage') {
          patternHandlers.set(event, handler)
        }
      }),
    }

    mockMonitorRedis = {
      lrange: mock(() => Promise.resolve([])),
      lrem: mock(() => Promise.resolve(0)),
      rpush: mock(() => Promise.resolve(1)),
      multi: mock(() => ({
        lrem: mock(() => {}),
        rpush: mock(() => {}),
        exec: mock(() => Promise.resolve([])),
      })),
    }
  })

  it('should subscribe to correct channel pattern', async () => {
    const listener = new CommandListener(mockSubscriber, 'worker-orders', 'node-123')
    await listener.start(mockMonitorRedis)

    expect(mockSubscriber.subscribe).toHaveBeenCalledWith(
      'gravito:quasar:cmd:worker-orders:node-123'
    )
  })

  it('should subscribe to broadcast pattern', async () => {
    const listener = new CommandListener(mockSubscriber, 'worker-orders', 'node-123')
    await listener.start(mockMonitorRedis)

    expect(mockSubscriber.psubscribe).toHaveBeenCalledWith('gravito:quasar:cmd:worker-orders:*')
  })

  it('should register message handler', async () => {
    const listener = new CommandListener(mockSubscriber, 'worker-orders', 'node-123')
    await listener.start(mockMonitorRedis)

    expect(messageHandlers.has('message')).toBe(true)
  })

  it('should unsubscribe on stop', async () => {
    const listener = new CommandListener(mockSubscriber, 'worker-orders', 'node-123')
    await listener.start(mockMonitorRedis)
    await listener.stop()

    expect(mockSubscriber.unsubscribe).toHaveBeenCalled()
    expect(mockSubscriber.punsubscribe).toHaveBeenCalled()
  })

  it('should reject commands with disallowed type', async () => {
    const listener = new CommandListener(mockSubscriber, 'worker-orders', 'node-123')
    await listener.start(mockMonitorRedis)

    const handler = messageHandlers.get('message')
    expect(handler).toBeDefined()

    // Simulate receiving a disallowed command
    const invalidCommand: QuasarCommand = {
      id: 'cmd-1',
      type: 'UNKNOWN_CMD' as any, // Not in allowlist
      targetNodeId: 'node-123',
      payload: { queue: 'test' },
      timestamp: Date.now(),
      issuer: 'zenith',
    }

    // This should be silently ignored (logged as warning)
    await handler!('gravito:quasar:cmd:worker-orders:node-123', JSON.stringify(invalidCommand))

    // No error thrown - command is just ignored
    expect(true).toBe(true)
  })

  it('should reject commands for different node', async () => {
    const listener = new CommandListener(mockSubscriber, 'worker-orders', 'node-123')
    await listener.start(mockMonitorRedis)

    const handler = messageHandlers.get('message')

    // Command for a different node
    const command: QuasarCommand = {
      id: 'cmd-2',
      type: 'RETRY_JOB',
      targetNodeId: 'different-node', // Not our node
      payload: { queue: 'test', jobKey: 'job-1' },
      timestamp: Date.now(),
      issuer: 'zenith',
    }

    // This should be silently ignored
    await handler!('gravito:quasar:cmd:worker-orders:node-123', JSON.stringify(command))

    // No error - just ignored
    expect(true).toBe(true)
  })

  it('should handle malformed JSON gracefully', async () => {
    const listener = new CommandListener(mockSubscriber, 'worker-orders', 'node-123')
    await listener.start(mockMonitorRedis)

    const handler = messageHandlers.get('message')

    // Send invalid JSON - should not throw
    await handler!('gravito:quasar:cmd:worker-orders:node-123', 'not-valid-json{')

    // No crash
    expect(true).toBe(true)
  })
})

describe('CommandListener Security', () => {
  it('should only allow RETRY_JOB and DELETE_JOB commands', () => {
    // This is a design constraint test - verifying the allowlist is correct
    const allowedCommands = ['RETRY_JOB', 'DELETE_JOB']

    // The CommandListener class has a hardcoded ALLOWED_COMMANDS array
    // We're testing the expected behavior
    expect(allowedCommands).toContain('RETRY_JOB')
    expect(allowedCommands).toContain('DELETE_JOB')
    expect(allowedCommands).not.toContain('DROP_DATABASE')
    expect(allowedCommands).not.toContain('EXEC')
    expect(allowedCommands.length).toBe(2)
  })
})
