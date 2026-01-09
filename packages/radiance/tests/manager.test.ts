import { describe, expect, it, mock } from 'bun:test'
import { BroadcastManager } from '../src/BroadcastManager'

const createCore = () => ({
  logger: {
    warn: mock(() => {}),
    error: mock(() => {}),
  },
})

describe('BroadcastManager', () => {
  it('warns when no driver is set', async () => {
    const core = createCore()
    const manager = new BroadcastManager(core as any)

    await manager.broadcast({}, { name: 'public', type: 'public' }, { ok: true }, 'Event')

    expect(core.logger.warn).toHaveBeenCalled()
  })

  it('bubbles driver errors', async () => {
    const core = createCore()
    const manager = new BroadcastManager(core as any)
    manager.setDriver({
      broadcast: async () => {
        throw new Error('boom')
      },
    })

    await expect(
      manager.broadcast({}, { name: 'public', type: 'public' }, { ok: true }, 'Event')
    ).rejects.toThrow('boom')

    expect(core.logger.error).toHaveBeenCalled()
  })

  it('authorizes channels with callback and driver', async () => {
    const core = createCore()
    const manager = new BroadcastManager(core as any)
    manager.setDriver({
      broadcast: async () => {},
      authorizeChannel: async () => ({ auth: 'token' }),
    })

    manager.setAuthCallback(async (channel, _socketId, userId) => {
      return channel === `private-user.${userId}`
    })

    const authorized = await manager.authorizeChannel('private-user.123', 'socket', '123')
    expect(authorized?.auth).toBe('token')

    const unauthorized = await manager.authorizeChannel('private-user.456', 'socket', '123')
    expect(unauthorized).toBeNull()
  })

  it('denies private channels without driver auth', async () => {
    const core = createCore()
    const manager = new BroadcastManager(core as any)

    const result = await manager.authorizeChannel('private-room', 'socket')
    expect(result).toBeNull()

    const publicResult = await manager.authorizeChannel('public-room', 'socket')
    expect(publicResult).toEqual({ auth: '' })
  })
})
