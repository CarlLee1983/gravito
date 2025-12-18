import { describe, expect, it } from 'bun:test'
import { ConsoleLogger, PlanetCore } from 'gravito-core'
import type { Notifiable } from '../src'
import { Notification, NotificationManager } from '../src'

describe('NotificationManager', () => {
  it('should send notifications through channels', async () => {
    const core = new PlanetCore({ logger: new ConsoleLogger() })
    const manager = new NotificationManager(core)

    let mailSent = false
    let databaseSaved = false

    // Mock mail channel
    manager.channel('mail', {
      send: async () => {
        mailSent = true
      },
    })

    // Mock database channel
    manager.channel('database', {
      send: async () => {
        databaseSaved = true
      },
    })

    class TestNotification extends Notification {
      via(_notifiable: Notifiable): string[] {
        return ['mail', 'database']
      }

      toMail(_notifiable: Notifiable) {
        return {
          subject: 'Test',
          to: 'test@example.com',
        }
      }

      toDatabase(_notifiable: Notifiable) {
        return {
          type: 'test',
          data: {},
        }
      }
    }

    const user: Notifiable = {
      getNotifiableId: () => '123',
      getNotifiableType: () => 'user',
    }

    await manager.send(user, new TestNotification())

    expect(mailSent).toBe(true)
    expect(databaseSaved).toBe(true)
  })

  it('should support ShouldQueue interface', () => {
    class QueuedNotification extends Notification {
      queue = 'notifications'
      delay = 60

      via(_notifiable: Notifiable): string[] {
        return ['mail']
      }
    }

    const notification = new QueuedNotification()
    expect(notification.shouldQueue()).toBe(true)
    expect(notification.getQueueConfig()).toEqual({
      queue: 'notifications',
      delay: 60,
    })
  })
})
