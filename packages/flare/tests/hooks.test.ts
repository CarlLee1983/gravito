import { describe, expect, it, jest } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { Notification } from '../src/Notification'
import { NotificationManager } from '../src/NotificationManager'
import type { Notifiable } from '../src/types'

// Mock Notifiable
const notifiable: Notifiable = {
  getNotifiableId: () => 'user-1',
}

class TestNotification extends Notification {
  via() {
    return ['mail']
  }
  toMail() {
    return { subject: 'Test', to: 'test@example.com' }
  }
}

describe('Notification Hooks', () => {
  it('should emit lifecycle hooks', async () => {
    const emit = jest.fn()
    const mockCore = {
      logger: { warn: () => {}, error: () => {} },
      hooks: { emit },
    } as unknown as PlanetCore

    const manager = new NotificationManager(mockCore)
    manager.channel('mail', { send: async () => {} })

    await manager.send(notifiable, new TestNotification())

    expect(emit).toHaveBeenCalledWith(
      'notification:sending',
      expect.objectContaining({
        notification: expect.any(TestNotification),
        notifiable,
        channels: ['mail'],
      })
    )

    expect(emit).toHaveBeenCalledWith(
      'notification:channel:sending',
      expect.objectContaining({
        channel: 'mail',
      })
    )

    expect(emit).toHaveBeenCalledWith(
      'notification:channel:sent',
      expect.objectContaining({
        channel: 'mail',
        duration: expect.any(Number),
      })
    )

    expect(emit).toHaveBeenCalledWith(
      'notification:sent',
      expect.objectContaining({
        allSuccess: true,
        totalDuration: expect.any(Number),
      })
    )
  })

  it('should emit failure hooks', async () => {
    const emit = jest.fn()
    const mockCore = {
      logger: { warn: () => {}, error: () => {} },
      hooks: { emit },
    } as unknown as PlanetCore

    const manager = new NotificationManager(mockCore)
    manager.channel('mail', {
      send: async () => {
        throw new Error('fail')
      },
    })

    await manager.send(notifiable, new TestNotification())

    expect(emit).toHaveBeenCalledWith(
      'notification:channel:failed',
      expect.objectContaining({
        channel: 'mail',
        error: expect.any(Error),
      })
    )

    expect(emit).toHaveBeenCalledWith(
      'notification:sent',
      expect.objectContaining({
        allSuccess: false,
      })
    )
  })

  it('should emit batch hooks', async () => {
    const emit = jest.fn()
    const mockCore = {
      logger: { warn: () => {}, error: () => {} },
      hooks: { emit },
    } as unknown as PlanetCore

    const manager = new NotificationManager(mockCore)
    manager.channel('mail', { send: async () => {} })

    const users = [notifiable, notifiable]
    await manager.sendBatch(users, new TestNotification())

    expect(emit).toHaveBeenCalledWith(
      'notification:batch:start',
      expect.objectContaining({
        count: 2,
      })
    )

    expect(emit).toHaveBeenCalledWith(
      'notification:batch:complete',
      expect.objectContaining({
        total: 2,
        success: 2,
        failed: 0,
      })
    )
  })
})
