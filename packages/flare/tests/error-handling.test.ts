import { describe, expect, it } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { Notification } from '../src/Notification'
import { NotificationManager } from '../src/NotificationManager'
import type { Notifiable } from '../src/types'

// Mock PlanetCore
const mockCore = {
  logger: {
    warn: () => {},
    error: () => {},
  },
  hooks: { emit: () => {} },
} as unknown as PlanetCore

// Mock Notifiable
const notifiable: Notifiable = {
  getNotifiableId: () => 'user-1',
}

describe('NotificationManager error handling', () => {
  it('should return detailed results for each channel', async () => {
    const manager = new NotificationManager(mockCore)

    // Valid channel
    manager.channel('mail', { send: async () => {} })
    // Broken channel
    manager.channel('broken', {
      send: async () => {
        throw new Error('fail')
      },
    })

    class TestNotification extends Notification {
      via() {
        return ['mail', 'broken']
      }
      toMail() {
        return { subject: 'Test', to: 'test@example.com' }
      }
    }

    const result = await manager.send(notifiable, new TestNotification())

    expect(result.allSuccess).toBe(false)
    expect(result.results).toHaveLength(2)

    const mailResult = result.results.find((r) => r.channel === 'mail')
    expect(mailResult).toBeDefined()
    expect(mailResult?.success).toBe(true)

    const brokenResult = result.results.find((r) => r.channel === 'broken')
    expect(brokenResult).toBeDefined()
    expect(brokenResult?.success).toBe(false)
    expect(brokenResult?.error).toBeInstanceOf(Error)
  })

  it('should throw AggregateError when throwOnError is true', async () => {
    const manager = new NotificationManager(mockCore)
    manager.channel('broken', {
      send: async () => {
        throw new Error('fail')
      },
    })

    class TestNotification extends Notification {
      via() {
        return ['broken']
      }
    }

    // Use try-catch block for testing async throw
    try {
      await manager.send(notifiable, new TestNotification(), { throwOnError: true })
      // Fail if no error thrown
      expect(true).toBe(false)
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateError)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((error as any).errors).toHaveLength(1)
    }
  })
})
