import { describe, expect, it, jest } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { Notification } from '../src/Notification'
import { NotificationManager } from '../src/NotificationManager'
import type { Notifiable, ShouldRetry } from '../src/types'

// Mock Notifiable
const notifiable: Notifiable = {
  getNotifiableId: () => 'user-1',
}

class RetryNotification extends Notification implements ShouldRetry {
  retry = {
    maxAttempts: 3,
    baseDelay: 10,
    backoff: 'fixed' as const,
  }

  via() {
    return ['mail']
  }
  toMail() {
    return { subject: 'Test', to: 'test@example.com' }
  }
}

describe('Retry Mechanism', () => {
  it('should retry failed channels', async () => {
    const emit = jest.fn()
    const mockCore = {
      logger: { warn: () => {}, error: () => {} },
      hooks: { emit },
    } as unknown as PlanetCore

    const manager = new NotificationManager(mockCore)
    let attempts = 0
    manager.channel('mail', {
      send: async () => {
        attempts++
        if (attempts < 3) {
          throw new Error('Network error')
        }
      },
    })

    const result = await manager.send(notifiable, new RetryNotification())

    expect(attempts).toBe(3)
    expect(result.allSuccess).toBe(true)

    // Check retry hooks
    expect(emit).toHaveBeenCalledWith(
      'notification:channel:retry',
      expect.objectContaining({
        attempt: 1,
        channel: 'mail',
      })
    )
    expect(emit).toHaveBeenCalledWith(
      'notification:channel:retry',
      expect.objectContaining({
        attempt: 2,
        channel: 'mail',
      })
    )
  })

  it('should fail after max attempts', async () => {
    const emit = jest.fn()
    const mockCore = {
      logger: { warn: () => {}, error: () => {} },
      hooks: { emit },
    } as unknown as PlanetCore

    const manager = new NotificationManager(mockCore)
    let attempts = 0
    manager.channel('mail', {
      send: async () => {
        attempts++
        throw new Error('Network error')
      },
    })

    const result = await manager.send(notifiable, new RetryNotification())

    expect(attempts).toBe(3)
    expect(result.allSuccess).toBe(false)
  })

  it('should override retry config via options', async () => {
    const emit = jest.fn()
    const mockCore = {
      logger: { warn: () => {}, error: () => {} },
      hooks: { emit },
    } as unknown as PlanetCore

    const manager = new NotificationManager(mockCore)
    let attempts = 0
    manager.channel('mail', {
      send: async () => {
        attempts++
        throw new Error('Network error')
      },
    })

    // Override to 1 attempt

    await manager.send(notifiable, new RetryNotification(), {
      retry: { maxAttempts: 1 },
    })

    expect(attempts).toBe(1)
  })
})
