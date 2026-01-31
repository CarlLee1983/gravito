import { describe, expect, test } from 'bun:test'
import { FortifyEventEmitter } from '../../src/events/EventEmitter'
import type { LoginEvent } from '../../src/events/types'

describe('FortifyEventEmitter', () => {
  test('subscribes to events using on()', () => {
    const emitter = new FortifyEventEmitter()
    const handler = () => {}

    emitter.on('auth:login', handler)

    expect(emitter.listenerCount('auth:login')).toBe(1)
  })

  test('emits events to subscribers', async () => {
    const emitter = new FortifyEventEmitter()
    let called = false
    let receivedData: LoginEvent | undefined

    emitter.on('auth:login', (data) => {
      called = true
      receivedData = data
    })

    const eventData: LoginEvent = {
      user: { id: 1, email: 'test@example.com' },
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      timestamp: new Date(),
    }

    await emitter.emit('auth:login', eventData)

    expect(called).toBe(true)
    expect(receivedData).toEqual(eventData)
  })

  test('supports async event handlers', async () => {
    const emitter = new FortifyEventEmitter()
    const executionOrder: number[] = []

    emitter.on('auth:login', async (_data) => {
      executionOrder.push(1)
      await new Promise((resolve) => setTimeout(resolve, 10))
      executionOrder.push(2)
    })

    await emitter.emit('auth:login', {
      user: { id: 1 },
      ip: '127.0.0.1',
      userAgent: 'test',
      timestamp: new Date(),
    })

    expect(executionOrder).toEqual([1, 2])
  })

  test('supports multiple listeners for same event', async () => {
    const emitter = new FortifyEventEmitter()
    const calls: number[] = []

    emitter.on('auth:logout', () => {
      calls.push(1)
    })
    emitter.on('auth:logout', () => {
      calls.push(2)
    })
    emitter.on('auth:logout', () => {
      calls.push(3)
    })

    expect(emitter.listenerCount('auth:logout')).toBe(3)

    await emitter.emit('auth:logout', {
      userId: 1,
      email: 'test@example.com',
      ip: '127.0.0.1',
      userAgent: 'test',
      timestamp: new Date(),
    })

    expect(calls).toEqual([1, 2, 3])
  })

  test('unsubscribes using off()', async () => {
    const emitter = new FortifyEventEmitter()
    let called = false
    const handler = () => {
      called = true
    }

    emitter.on('auth:register', handler)
    expect(emitter.listenerCount('auth:register')).toBe(1)

    emitter.off('auth:register', handler)
    expect(emitter.listenerCount('auth:register')).toBe(0)

    await emitter.emit('auth:register', {
      user: { id: 1 },
      ip: '127.0.0.1',
      userAgent: 'test',
      timestamp: new Date(),
    })

    expect(called).toBe(false)
  })

  test('unsubscribes using returned function', async () => {
    const emitter = new FortifyEventEmitter()
    let called = false

    const unsubscribe = emitter.on('auth:register', () => {
      called = true
    })

    expect(emitter.listenerCount('auth:register')).toBe(1)

    unsubscribe()
    expect(emitter.listenerCount('auth:register')).toBe(0)

    await emitter.emit('auth:register', {
      user: { id: 1 },
      ip: '127.0.0.1',
      userAgent: 'test',
      timestamp: new Date(),
    })

    expect(called).toBe(false)
  })

  test('removeAllListeners() removes all listeners for specific event', async () => {
    const emitter = new FortifyEventEmitter()
    let loginCalls = 0
    let logoutCalls = 0

    emitter.on('auth:login', () => {
      loginCalls++
    })
    emitter.on('auth:login', () => {
      loginCalls++
    })
    emitter.on('auth:logout', () => {
      logoutCalls++
    })

    expect(emitter.listenerCount('auth:login')).toBe(2)
    expect(emitter.listenerCount('auth:logout')).toBe(1)

    emitter.removeAllListeners('auth:login')

    expect(emitter.listenerCount('auth:login')).toBe(0)
    expect(emitter.listenerCount('auth:logout')).toBe(1)

    await emitter.emit('auth:login', {
      user: { id: 1 },
      ip: '127.0.0.1',
      userAgent: 'test',
      timestamp: new Date(),
    })
    await emitter.emit('auth:logout', {
      userId: 1,
      email: 'test@example.com',
      ip: '127.0.0.1',
      userAgent: 'test',
      timestamp: new Date(),
    })

    expect(loginCalls).toBe(0)
    expect(logoutCalls).toBe(1)
  })

  test('removeAllListeners() without argument removes all listeners', async () => {
    const emitter = new FortifyEventEmitter()
    let totalCalls = 0

    emitter.on('auth:login', () => {
      totalCalls++
    })
    emitter.on('auth:logout', () => {
      totalCalls++
    })
    emitter.on('auth:register', () => {
      totalCalls++
    })

    expect(emitter.listenerCount('auth:login')).toBe(1)
    expect(emitter.listenerCount('auth:logout')).toBe(1)
    expect(emitter.listenerCount('auth:register')).toBe(1)

    emitter.removeAllListeners()

    expect(emitter.listenerCount('auth:login')).toBe(0)
    expect(emitter.listenerCount('auth:logout')).toBe(0)
    expect(emitter.listenerCount('auth:register')).toBe(0)

    await emitter.emit('auth:login', {
      user: { id: 1 },
      ip: '127.0.0.1',
      userAgent: 'test',
      timestamp: new Date(),
    })

    expect(totalCalls).toBe(0)
  })

  test('eventNames() returns registered event names', () => {
    const emitter = new FortifyEventEmitter()

    emitter.on('auth:login', () => {})
    emitter.on('auth:logout', () => {})
    emitter.on('auth:register', () => {})

    const names = emitter.eventNames()

    expect(names).toContain('auth:login')
    expect(names).toContain('auth:logout')
    expect(names).toContain('auth:register')
    expect(names.length).toBe(3)
  })

  test('eventNames() returns empty array when no listeners', () => {
    const emitter = new FortifyEventEmitter()

    const names = emitter.eventNames()

    expect(names).toEqual([])
  })

  test('listenerCount() returns 0 for non-existent event', () => {
    const emitter = new FortifyEventEmitter()

    expect(emitter.listenerCount('auth:login')).toBe(0)
  })

  test('emitting event with no listeners does nothing', async () => {
    const emitter = new FortifyEventEmitter()

    await expect(
      emitter.emit('auth:login', {
        user: { id: 1 },
        ip: '127.0.0.1',
        userAgent: 'test',
        timestamp: new Date(),
      })
    ).resolves.toBeUndefined()
  })

  test('removing non-existent listener does nothing', () => {
    const emitter = new FortifyEventEmitter()
    const handler = () => {}

    expect(() => emitter.off('auth:login', handler)).not.toThrow()
  })

  test('supports all event types', async () => {
    const emitter = new FortifyEventEmitter()
    const calls: string[] = []

    emitter.on('auth:login', () => {
      calls.push('login')
    })
    emitter.on('auth:logout', () => {
      calls.push('logout')
    })
    emitter.on('auth:register', () => {
      calls.push('register')
    })
    emitter.on('auth:password-reset-requested', () => {
      calls.push('reset-requested')
    })
    emitter.on('auth:password-reset', () => {
      calls.push('password-reset')
    })
    emitter.on('auth:email-verified', () => {
      calls.push('email-verified')
    })
    emitter.on('auth:email-verification-sent', () => {
      calls.push('verification-sent')
    })
    emitter.on('auth:login-failed', () => {
      calls.push('login-failed')
    })
    emitter.on('auth:account-locked', () => {
      calls.push('account-locked')
    })

    const timestamp = new Date()

    await emitter.emit('auth:login', {
      user: { id: 1 },
      ip: '127.0.0.1',
      userAgent: 'test',
      timestamp,
    })
    await emitter.emit('auth:logout', {
      userId: 1,
      email: 'test@example.com',
      ip: '127.0.0.1',
      userAgent: 'test',
      timestamp,
    })
    await emitter.emit('auth:register', {
      user: { id: 1 },
      ip: '127.0.0.1',
      userAgent: 'test',
      timestamp,
    })
    await emitter.emit('auth:password-reset-requested', {
      email: 'test@example.com',
      ip: '127.0.0.1',
      userAgent: 'test',
      timestamp,
    })
    await emitter.emit('auth:password-reset', {
      user: { id: 1 },
      ip: '127.0.0.1',
      userAgent: 'test',
      timestamp,
    })
    await emitter.emit('auth:email-verified', {
      user: { id: 1 },
      ip: '127.0.0.1',
      userAgent: 'test',
      timestamp,
    })
    await emitter.emit('auth:email-verification-sent', {
      userId: 1,
      email: 'test@example.com',
      ip: '127.0.0.1',
      userAgent: 'test',
      timestamp,
    })
    await emitter.emit('auth:login-failed', {
      email: 'test@example.com',
      ip: '127.0.0.1',
      userAgent: 'test',
      reason: 'invalid credentials',
      timestamp,
    })
    await emitter.emit('auth:account-locked', {
      userId: 1,
      email: 'test@example.com',
      lockedUntil: new Date(),
      permanent: false,
      ip: '127.0.0.1',
      userAgent: 'test',
      timestamp,
    })

    expect(calls).toEqual([
      'login',
      'logout',
      'register',
      'reset-requested',
      'password-reset',
      'email-verified',
      'verification-sent',
      'login-failed',
      'account-locked',
    ])
  })
})
