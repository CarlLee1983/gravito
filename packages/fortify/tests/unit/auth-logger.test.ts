import { describe, expect, test } from 'bun:test'
import { MemoryAuthLogger } from '../../src/services/AuthLogger'

describe('MemoryAuthLogger', () => {
  test('logs authentication events', async () => {
    const logger = new MemoryAuthLogger()

    await logger.log({
      type: 'login_success',
      userId: 1,
      email: 'test@example.com',
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      success: true,
    })

    const events = await logger.getRecentEvents(1, 10)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('login_success')
    expect(events[0].userId).toBe(1)
    expect(events[0].email).toBe('test@example.com')
    expect(events[0].success).toBe(true)
  })

  test('tracks multiple events for a user', async () => {
    const logger = new MemoryAuthLogger()

    await logger.log({
      type: 'login_attempt',
      userId: 1,
      email: 'test@example.com',
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      success: false,
    })

    // Small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10))

    await logger.log({
      type: 'login_success',
      userId: 1,
      email: 'test@example.com',
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      success: true,
    })

    const events = await logger.getRecentEvents(1, 10)
    expect(events).toHaveLength(2)
    expect(events[0].type).toBe('login_success')
    expect(events[1].type).toBe('login_attempt')
  })

  test('limits returned events by count', async () => {
    const logger = new MemoryAuthLogger()

    for (let i = 0; i < 15; i++) {
      await logger.log({
        type: 'login_attempt',
        userId: 1,
        email: 'test@example.com',
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        success: false,
      })
    }

    const events = await logger.getRecentEvents(1, 5)
    expect(events).toHaveLength(5)
  })

  test('returns events in reverse chronological order', async () => {
    const logger = new MemoryAuthLogger()

    await logger.log({
      type: 'login_attempt',
      userId: 1,
      email: 'test@example.com',
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      success: false,
      metadata: { attempt: 1 },
    })

    await new Promise((resolve) => setTimeout(resolve, 10))

    await logger.log({
      type: 'login_attempt',
      userId: 1,
      email: 'test@example.com',
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      success: false,
      metadata: { attempt: 2 },
    })

    const events = await logger.getRecentEvents(1, 10)
    expect(events[0].metadata?.attempt).toBe(2)
    expect(events[1].metadata?.attempt).toBe(1)
  })

  test('tracks failed login attempts by email', async () => {
    const logger = new MemoryAuthLogger()
    const since = new Date()

    await logger.log({
      type: 'login_failure',
      email: 'test@example.com',
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      success: false,
    })

    await logger.log({
      type: 'login_failure',
      email: 'test@example.com',
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      success: false,
    })

    await logger.log({
      type: 'login_success',
      email: 'test@example.com',
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      success: true,
    })

    const failures = await logger.getFailedAttempts('test@example.com', since)
    expect(failures).toHaveLength(2)
    expect(failures.every((e) => !e.success)).toBe(true)
  })

  test('filters failed attempts by time window', async () => {
    const logger = new MemoryAuthLogger()

    await logger.log({
      type: 'login_failure',
      email: 'test@example.com',
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      success: false,
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    const recentDate = new Date()

    await logger.log({
      type: 'login_failure',
      email: 'test@example.com',
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      success: false,
    })

    const failures = await logger.getFailedAttempts('test@example.com', recentDate)
    expect(failures).toHaveLength(1)
  })

  test('supports optional metadata field', async () => {
    const logger = new MemoryAuthLogger()

    await logger.log({
      type: 'account_locked',
      userId: 1,
      email: 'test@example.com',
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      success: false,
      metadata: {
        reason: 'too_many_attempts',
        lockoutDuration: 30,
      },
    })

    const events = await logger.getRecentEvents(1, 10)
    expect(events[0].metadata?.reason).toBe('too_many_attempts')
    expect(events[0].metadata?.lockoutDuration).toBe(30)
  })

  test('clears all events', async () => {
    const logger = new MemoryAuthLogger()

    await logger.log({
      type: 'login_success',
      userId: 1,
      email: 'test@example.com',
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      success: true,
    })

    logger.clear()

    const events = await logger.getRecentEvents(1, 10)
    expect(events).toHaveLength(0)
  })
})
