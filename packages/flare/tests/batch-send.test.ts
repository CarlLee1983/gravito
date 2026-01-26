import { describe, expect, it } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { Notification } from '../src/Notification'
import { NotificationManager } from '../src/NotificationManager'
import type { Notifiable } from '../src/types'

class TestNotification extends Notification {
  via() {
    return ['mail']
  }
  toMail() {
    return { subject: 'Test', to: 'test@example.com' }
  }
}

describe('Batch Sending', () => {
  it('should send notifications in batches', async () => {
    const emit = () => {}
    const mockCore = {
      logger: { warn: () => {}, error: () => {} },
      hooks: { emit },
    } as unknown as PlanetCore

    const manager = new NotificationManager(mockCore)
    let sendCount = 0
    manager.channel('mail', {
      send: async () => {
        sendCount++
      },
    })

    const users = Array.from({ length: 5 }, (_, i) => ({
      getNotifiableId: () => i,
    }))

    const result = await manager.sendBatch(users, new TestNotification(), { batchConcurrency: 2 })

    expect(result.total).toBe(5)
    expect(result.success).toBe(5)
    expect(sendCount).toBe(5)
    expect(result.results).toHaveLength(5)
  })

  it('should support streaming', async () => {
    const emit = () => {}
    const mockCore = {
      logger: { warn: () => {}, error: () => {} },
      hooks: { emit },
    } as unknown as PlanetCore

    const manager = new NotificationManager(mockCore)
    manager.channel('mail', { send: async () => {} })

    async function* userGenerator() {
      yield { getNotifiableId: () => 1 }
      yield { getNotifiableId: () => 2 }
      yield { getNotifiableId: () => 3 }
    }

    const results = []
    for await (const result of manager.sendBatchStream(userGenerator(), new TestNotification(), {
      batchSize: 2,
    })) {
      results.push(result)
    }

    expect(results).toHaveLength(3)
  })
})
