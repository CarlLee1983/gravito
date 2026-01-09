import { describe, expect, it, jest } from 'bun:test'
import { BroadcastChannel } from '../src/channels/BroadcastChannel'
import { DatabaseChannel } from '../src/channels/DatabaseChannel'
import { MailChannel } from '../src/channels/MailChannel'
import { SlackChannel } from '../src/channels/SlackChannel'
import { SmsChannel } from '../src/channels/SmsChannel'
import { Notification } from '../src/Notification'
import { NotificationManager } from '../src/NotificationManager'
import { OrbitFlare } from '../src/OrbitFlare'
import type { Notifiable } from '../src/types'

const notifiable: Notifiable = {
  getNotifiableId: () => '123',
  getNotifiableType: () => 'user',
}

class FullNotification extends Notification {
  via(_notifiable: Notifiable): string[] {
    return ['mail', 'database', 'broadcast', 'slack', 'sms']
  }

  toMail(_notifiable: Notifiable) {
    return { subject: 'Subject', to: 'test@example.com' }
  }

  toDatabase(_notifiable: Notifiable) {
    return { type: 'notice', data: { ok: true } }
  }

  toBroadcast(_notifiable: Notifiable) {
    return { type: 'notice', data: { ok: true } }
  }

  toSlack(_notifiable: Notifiable) {
    return { text: 'Hello', channel: '#alerts' }
  }

  toSms(_notifiable: Notifiable) {
    return { to: '+123', message: 'Hello' }
  }
}

describe('Notification', () => {
  it('reports queue configuration only when queue properties exist', () => {
    class BasicNotification extends Notification {
      via(_notifiable: Notifiable): string[] {
        return []
      }
    }

    const basic = new BasicNotification()
    expect(basic.shouldQueue()).toBe(false)
    expect(basic.getQueueConfig()).toEqual({})

    class QueuedNotification extends Notification {
      queue = 'notifications'
      delay = 60

      via(_notifiable: Notifiable): string[] {
        return []
      }
    }

    const queued = new QueuedNotification()
    expect(queued.shouldQueue()).toBe(true)
    expect(queued.getQueueConfig()).toEqual({
      queue: 'notifications',
      delay: 60,
      connection: undefined,
    })
  })

  it('throws for unimplemented channel methods', () => {
    class BasicNotification extends Notification {
      via(_notifiable: Notifiable): string[] {
        return []
      }
    }

    const notification = new BasicNotification()
    expect(() => notification.toMail?.(notifiable)).toThrow('toMail method not implemented')
    expect(() => notification.toDatabase?.(notifiable)).toThrow('toDatabase method not implemented')
  })
})

describe('NotificationManager', () => {
  it('sends notifications through channels and logs errors', async () => {
    const core = {
      logger: { warn: jest.fn(), error: jest.fn() },
    }
    const manager = new NotificationManager(core as any)

    let mailSent = false
    manager.channel('mail', {
      send: async () => {
        mailSent = true
      },
    })

    manager.channel('broken', {
      send: async () => {
        throw new Error('fail')
      },
    })

    class TestNotification extends Notification {
      via(_notifiable: Notifiable): string[] {
        return ['mail', 'missing', 'broken']
      }

      toMail(_notifiable: Notifiable) {
        return { subject: 'Test', to: 'test@example.com' }
      }
    }

    await manager.send(notifiable, new TestNotification())

    expect(mailSent).toBe(true)
    expect(core.logger.warn).toHaveBeenCalledWith(
      "[NotificationManager] Channel 'missing' not found, skipping"
    )
    expect(core.logger.error).toHaveBeenCalled()
  })

  it('queues notifications when queue manager is set', async () => {
    const core = {
      logger: { warn: jest.fn(), error: jest.fn() },
    }
    const manager = new NotificationManager(core as any)
    const queuePush = jest.fn(async () => {})
    manager.setQueueManager({ push: queuePush })

    class QueuedNotification extends Notification {
      queue = 'notifications'
      delay = 30

      via(_notifiable: Notifiable): string[] {
        return ['mail']
      }

      toMail(_notifiable: Notifiable) {
        return { subject: 'Queued', to: 'test@example.com' }
      }
    }

    manager.channel('mail', { send: async () => {} })

    await manager.send(notifiable, new QueuedNotification())

    expect(queuePush).toHaveBeenCalledTimes(1)
    const job = queuePush.mock.calls[0][0]
    await job.handle()
  })
})

describe('Channels', () => {
  it('sends mail notifications', async () => {
    const mailService = { send: jest.fn(async () => {}) }
    const channel = new MailChannel(mailService)
    const notification = new FullNotification()

    await channel.send(notification, notifiable)

    expect(mailService.send).toHaveBeenCalledWith({ subject: 'Subject', to: 'test@example.com' })
  })

  it('persists database notifications', async () => {
    const dbService = { insertNotification: jest.fn(async () => {}) }
    const channel = new DatabaseChannel(dbService)
    const notification = new FullNotification()

    await channel.send(notification, notifiable)

    expect(dbService.insertNotification).toHaveBeenCalledWith({
      notifiableId: '123',
      notifiableType: 'user',
      type: 'notice',
      data: { ok: true },
    })
  })

  it('broadcasts notifications', async () => {
    const broadcastService = { broadcast: jest.fn(async () => {}) }
    const channel = new BroadcastChannel(broadcastService)
    const notification = new FullNotification()

    await channel.send(notification, notifiable)

    expect(broadcastService.broadcast).toHaveBeenCalledWith('private-user.123', 'notice', {
      ok: true,
    })
  })

  it('posts Slack notifications', async () => {
    const originalFetch = globalThis.fetch
    const fetchMock = jest.fn(async () => new Response('', { status: 200 }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    try {
      const channel = new SlackChannel({ webhookUrl: 'https://example.com/slack' })
      const notification = new FullNotification()

      await channel.send(notification, notifiable)

      expect(fetchMock).toHaveBeenCalledTimes(1)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('throws when Slack webhook responds with error', async () => {
    const originalFetch = globalThis.fetch
    const fetchMock = jest.fn(async () => new Response('', { status: 500, statusText: 'nope' }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    try {
      const channel = new SlackChannel({ webhookUrl: 'https://example.com/slack' })
      const notification = new FullNotification()

      await expect(channel.send(notification, notifiable)).rejects.toThrow(
        'Failed to send Slack notification'
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('sends SMS via Twilio when configured', async () => {
    const originalFetch = globalThis.fetch
    const fetchMock = jest.fn(async () => new Response('', { status: 200 }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    try {
      const channel = new SmsChannel({
        provider: 'twilio',
        apiKey: 'sid',
        apiSecret: 'token',
        from: '+999',
      })
      const notification = new FullNotification()

      await channel.send(notification, notifiable)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('throws for unsupported SMS providers', async () => {
    const channel = new SmsChannel({ provider: 'unknown' })
    const notification = new FullNotification()

    await expect(channel.send(notification, notifiable)).rejects.toThrow('Unsupported SMS provider')
  })

  it('throws for missing Twilio credentials', async () => {
    const channel = new SmsChannel({ provider: 'twilio' })
    const notification = new FullNotification()

    await expect(channel.send(notification, notifiable)).rejects.toThrow(
      'Twilio API key and secret are required'
    )
  })
})

describe('OrbitFlare', () => {
  it('registers notification manager and queue integration', async () => {
    const services = new Map<string, unknown>()
    services.set('mail', { send: async () => {} })
    services.set('db', { insertNotification: async () => {} })
    services.set('broadcast', { broadcast: async () => {} })
    const queue = { push: jest.fn(async () => {}) }
    services.set('queue', queue)

    const core = {
      services,
      logger: { warn: jest.fn(), info: jest.fn() },
    }

    const orbit = new OrbitFlare()
    await orbit.install(core as any)

    const manager = services.get('notifications') as NotificationManager
    expect(manager).toBeInstanceOf(NotificationManager)

    class QueuedNotification extends Notification {
      queue = 'notifications'
      delay = 10

      via(_notifiable: Notifiable): string[] {
        return ['mail']
      }

      toMail(_notifiable: Notifiable) {
        return { subject: 'Queued', to: 'test@example.com' }
      }
    }

    await manager.send(notifiable, new QueuedNotification())
    expect(queue.push).toHaveBeenCalled()
  })

  it('logs warnings when services are missing', async () => {
    const core = {
      services: new Map(),
      logger: { warn: jest.fn(), info: jest.fn() },
    }

    const orbit = OrbitFlare.configure({ enableSlack: true, enableSms: true })
    await orbit.install(core as any)

    expect(core.logger.warn).toHaveBeenCalledWith(
      '[OrbitFlare] Mail service not found, mail channel disabled'
    )
    expect(core.logger.warn).toHaveBeenCalledWith(
      '[OrbitFlare] Database service not found, database channel disabled'
    )
    expect(core.logger.warn).toHaveBeenCalledWith(
      '[OrbitFlare] Broadcast service not found, broadcast channel disabled'
    )
    expect(core.logger.warn).toHaveBeenCalledWith(
      '[OrbitFlare] Slack configuration not found, slack channel disabled'
    )
    expect(core.logger.warn).toHaveBeenCalledWith(
      '[OrbitFlare] SMS configuration not found, sms channel disabled'
    )
  })
})
