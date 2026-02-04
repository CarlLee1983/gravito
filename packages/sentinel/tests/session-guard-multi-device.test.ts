import { describe, expect, it, mock } from 'bun:test'
import type { SessionRepository } from '../src/contracts/SessionRepository'
import { SessionGuard } from '../src/guards/SessionGuard'

describe('SessionGuard Multi-Device', () => {
  it('logs out other devices', async () => {
    const user = {
      getAuthIdentifier: () => 'user-1',
    }
    const provider = {
      retrieveById: async () => user,
      validateCredentials: async () => true,
      retrieveByCredentials: async () => user,
    } as any

    const sessionStore = {
      get: mock(() => 'session-123'),
      put: mock(() => {}),
      forget: mock(() => {}),
      regenerate: mock(async () => {}),
      id: () => 'session-current',
    }

    const ctx = {
      get: (key: string) => (key === 'session' ? sessionStore : null),
      header: () => {},
    } as any

    const repository: SessionRepository = {
      findAllByUserId: async () => [],
      destroy: async () => {},
      destroyAllByUserId: async () => {},
      destroyAllByUserIdExcept: mock(async () => {}),
    }

    const guard = new SessionGuard('web', provider, ctx)
    guard.setSessionRepository(repository)

    // Simulate logged in
    guard.setUser(user as any)

    await guard.logoutOtherDevices('password')

    expect(repository.destroyAllByUserIdExcept).toHaveBeenCalledWith('user-1', 'session-current')
  })

  it('logs out all devices', async () => {
    const user = {
      getAuthIdentifier: () => 'user-1',
    }
    const provider = {
      retrieveById: async () => user,
    } as any

    const sessionStore = {
      get: mock(() => 'session-123'),
      put: mock(() => {}),
      forget: mock(() => {}),
      regenerate: mock(async () => {}),
    }

    const ctx = {
      get: (key: string) => (key === 'session' ? sessionStore : null),
      header: () => {},
    } as any

    const repository: SessionRepository = {
      findAllByUserId: async () => [],
      destroy: async () => {},
      destroyAllByUserId: mock(async () => {}),
      destroyAllByUserIdExcept: async () => {},
    }

    const guard = new SessionGuard('web', provider, ctx)
    guard.setSessionRepository(repository)
    guard.setUser(user as any)

    await guard.logoutAllDevices()

    expect(repository.destroyAllByUserId).toHaveBeenCalledWith('user-1')
    expect(sessionStore.forget).toHaveBeenCalled() // Current session logout
  })

  it('throws error if repository is not set', async () => {
    const guard = new SessionGuard('web', {} as any, {} as any)

    expect(guard.logoutAllDevices()).rejects.toThrow('SessionRepository is not configured')
  })
})
