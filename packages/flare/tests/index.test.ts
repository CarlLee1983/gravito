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

  it('does not have default implementations for channel methods', () => {
    class BasicNotification extends Notification {
      via(_notifiable: Notifiable): string[] {
        return []
      }
    }

    const notification = new BasicNotification()
    expect(notification.toMail).toBeUndefined()
    expect(notification.toDatabase).toBeUndefined()
  })
})

describe('NotificationManager', () => {
  it('sends notifications through channels and logs errors', async () => {
    const core = {
      logger: { warn: jest.fn(), error: jest.fn() },
      hooks: { emit: jest.fn() },
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
      hooks: { emit: jest.fn() },
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calls = queuePush.mock.calls as any[][]
    const job = calls[0]?.[0]
    if (job) {
      await job.handle()
    }
  })

  describe('Metrics', () => {
    it('enableMetrics() 應該啟用 metrics 收集', () => {
      const core = {
        logger: { warn: jest.fn(), error: jest.fn() },
        hooks: { emit: jest.fn() },
      }
      const manager = new NotificationManager(core as any)

      // 預設情況下，metrics 應該是未啟用的
      expect(manager.getMetrics()).toBeUndefined()

      // 啟用 metrics
      manager.enableMetrics()

      // 現在 getMetrics 應該返回空的摘要
      const metrics = manager.getMetrics()
      expect(metrics).toBeDefined()
      expect(metrics?.totalSent).toBe(0)
    })

    it('enableMetrics() 應該支援自訂歷史記錄上限', () => {
      const core = {
        logger: { warn: jest.fn(), error: jest.fn() },
        hooks: { emit: jest.fn() },
      }
      const manager = new NotificationManager(core as any)

      manager.enableMetrics(5)

      // 這個測試只是確認不會拋出錯誤
      expect(manager.getMetrics()).toBeDefined()
    })

    it('getMetrics() 應該返回通知 metrics 摘要', async () => {
      const core = {
        logger: { warn: jest.fn(), error: jest.fn() },
        hooks: { emit: jest.fn() },
      }
      const manager = new NotificationManager(core as any)
      manager.enableMetrics()

      manager.channel('mail', {
        send: async () => {},
      })

      class TestNotification extends Notification {
        via(_notifiable: Notifiable): string[] {
          return ['mail']
        }

        toMail(_notifiable: Notifiable) {
          return { subject: 'Test', to: 'test@example.com' }
        }
      }

      await manager.send(notifiable, new TestNotification())

      const metrics = manager.getMetrics()
      expect(metrics).toBeDefined()
      expect(metrics?.totalSent).toBe(1)
      expect(metrics?.totalSuccess).toBe(1)
      expect(metrics?.byChannel.mail).toBeDefined()
      expect(metrics?.byChannel.mail.success).toBe(1)
    })

    it('getMetrics() 應該支援 since 參數過濾', async () => {
      const core = {
        logger: { warn: jest.fn(), error: jest.fn() },
        hooks: { emit: jest.fn() },
      }
      const manager = new NotificationManager(core as any)
      manager.enableMetrics()

      manager.channel('mail', {
        send: async () => {},
      })

      class TestNotification extends Notification {
        via(_notifiable: Notifiable): string[] {
          return ['mail']
        }

        toMail(_notifiable: Notifiable) {
          return { subject: 'Test', to: 'test@example.com' }
        }
      }

      const beforeSend = new Date()
      await new Promise((resolve) => setTimeout(resolve, 10)) // 確保有時間差異

      await manager.send(notifiable, new TestNotification())

      // 使用 since 參數
      const metricsAll = manager.getMetrics()
      const metricsSince = manager.getMetrics(beforeSend)

      expect(metricsAll?.totalSent).toBe(1)
      expect(metricsSince?.totalSent).toBe(1)

      // 使用未來時間應該返回 0
      const futureMetrics = manager.getMetrics(new Date(Date.now() + 10000))
      expect(futureMetrics?.totalSent).toBe(0)
    })

    it('getRecentFailures() 應該返回最近的失敗記錄', async () => {
      const core = {
        logger: { warn: jest.fn(), error: jest.fn() },
        hooks: { emit: jest.fn() },
      }
      const manager = new NotificationManager(core as any)
      manager.enableMetrics()

      manager.channel('broken', {
        send: async () => {
          throw new Error('Test error')
        },
      })

      class TestNotification extends Notification {
        via(_notifiable: Notifiable): string[] {
          return ['broken']
        }
      }

      await manager.send(notifiable, new TestNotification())

      const failures = manager.getRecentFailures(5)
      expect(failures).toBeDefined()
      expect(failures.length).toBe(1)
      expect(failures[0].success).toBe(false)
      expect(failures[0].channel).toBe('broken')
      expect(failures[0].error).toContain('Test error')
    })

    it('getRecentFailures() 應該在未啟用 metrics 時返回空陣列', () => {
      const core = {
        logger: { warn: jest.fn(), error: jest.fn() },
        hooks: { emit: jest.fn() },
      }
      const manager = new NotificationManager(core as any)

      const failures = manager.getRecentFailures()
      expect(failures).toEqual([])
    })

    it('getRecentFailures() 應該支援自訂 limit 參數', async () => {
      const core = {
        logger: { warn: jest.fn(), error: jest.fn() },
        hooks: { emit: jest.fn() },
      }
      const manager = new NotificationManager(core as any)
      manager.enableMetrics()

      manager.channel('broken', {
        send: async () => {
          throw new Error('Test error')
        },
      })

      class TestNotification extends Notification {
        via(_notifiable: Notifiable): string[] {
          return ['broken']
        }
      }

      // 發送 5 次失敗的通知
      for (let i = 0; i < 5; i++) {
        await manager.send(notifiable, new TestNotification())
      }

      const failures = manager.getRecentFailures(3)
      expect(failures.length).toBe(3)
    })
  })

  describe('Concurrency Limit', () => {
    it('sendWithConcurrencyLimit() 應該限制並發數量', async () => {
      const core = {
        logger: { warn: jest.fn(), error: jest.fn() },
        hooks: { emit: jest.fn() },
      }
      const manager = new NotificationManager(core as any)

      let concurrentCount = 0
      let maxConcurrent = 0

      manager.channel('mail', {
        send: async () => {
          concurrentCount++
          maxConcurrent = Math.max(maxConcurrent, concurrentCount)
          await new Promise((resolve) => setTimeout(resolve, 50))
          concurrentCount--
        },
      })

      manager.channel('sms', {
        send: async () => {
          concurrentCount++
          maxConcurrent = Math.max(maxConcurrent, concurrentCount)
          await new Promise((resolve) => setTimeout(resolve, 50))
          concurrentCount--
        },
      })

      manager.channel('slack', {
        send: async () => {
          concurrentCount++
          maxConcurrent = Math.max(maxConcurrent, concurrentCount)
          await new Promise((resolve) => setTimeout(resolve, 50))
          concurrentCount--
        },
      })

      class TestNotification extends Notification {
        via(_notifiable: Notifiable): string[] {
          return ['mail', 'sms', 'slack']
        }

        toMail(_notifiable: Notifiable) {
          return { subject: 'Test', to: 'test@example.com' }
        }

        toSms(_notifiable: Notifiable) {
          return { to: '+123', message: 'Test' }
        }

        toSlack(_notifiable: Notifiable) {
          return { text: 'Test', channel: '#test' }
        }
      }

      await manager.send(notifiable, new TestNotification(), {
        concurrency: 2,
      })

      expect(maxConcurrent).toBeLessThanOrEqual(2)
    })
  })

  describe('Send Modes', () => {
    it('應該支援 parallel 模式（預設）', async () => {
      const core = {
        logger: { warn: jest.fn(), error: jest.fn() },
        hooks: { emit: jest.fn() },
      }
      const manager = new NotificationManager(core as any)

      const sendOrder: string[] = []

      manager.channel('mail', {
        send: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          sendOrder.push('mail')
        },
      })

      manager.channel('sms', {
        send: async () => {
          sendOrder.push('sms')
        },
      })

      class TestNotification extends Notification {
        via(_notifiable: Notifiable): string[] {
          return ['mail', 'sms']
        }

        toMail(_notifiable: Notifiable) {
          return { subject: 'Test', to: 'test@example.com' }
        }

        toSms(_notifiable: Notifiable) {
          return { to: '+123', message: 'Test' }
        }
      }

      const result = await manager.send(notifiable, new TestNotification(), {
        parallel: true,
      })

      // parallel 模式下，sms 應該先完成（因為沒有延遲）
      expect(sendOrder[0]).toBe('sms')
      expect(sendOrder[1]).toBe('mail')
      expect(result.allSuccess).toBe(true)
    })

    it('應該支援 sequential 模式', async () => {
      const core = {
        logger: { warn: jest.fn(), error: jest.fn() },
        hooks: { emit: jest.fn() },
      }
      const manager = new NotificationManager(core as any)

      const sendOrder: string[] = []

      manager.channel('mail', {
        send: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          sendOrder.push('mail')
        },
      })

      manager.channel('sms', {
        send: async () => {
          sendOrder.push('sms')
        },
      })

      class TestNotification extends Notification {
        via(_notifiable: Notifiable): string[] {
          return ['mail', 'sms']
        }

        toMail(_notifiable: Notifiable) {
          return { subject: 'Test', to: 'test@example.com' }
        }

        toSms(_notifiable: Notifiable) {
          return { to: '+123', message: 'Test' }
        }
      }

      const result = await manager.send(notifiable, new TestNotification(), {
        parallel: false,
      })

      // sequential 模式下，應該按照 via() 返回的順序執行
      expect(sendOrder[0]).toBe('mail')
      expect(sendOrder[1]).toBe('sms')
      expect(result.allSuccess).toBe(true)
    })
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
    const instances = new Map<string, unknown>()
    instances.set('mail', { send: async () => {} })
    instances.set('db', { insertNotification: async () => {} })
    instances.set('broadcast', { broadcast: async () => {} })
    const queue = { push: jest.fn(async () => {}) }
    instances.set('queue', queue)

    const core = {
      container: {
        make: (key: string) => instances.get(key),
        instance: (key: string, instance: unknown) => instances.set(key, instance),
      },
      logger: { warn: jest.fn(), info: jest.fn() },
      hooks: { emit: jest.fn() },
    }

    const orbit = new OrbitFlare()
    await orbit.install(core as any)

    const manager = instances.get('notifications') as NotificationManager
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
    const instances = new Map<string, unknown>()
    const core = {
      container: {
        make: (key: string) => instances.get(key),
        instance: (key: string, instance: unknown) => instances.set(key, instance),
      },
      logger: { warn: jest.fn(), info: jest.fn() },
      hooks: { emit: jest.fn() },
    }

    const orbit = OrbitFlare.configure({
      enableSlack: true,
      enableSms: true,
      channels: {
        slack: { webhookUrl: 'https://example.com' },
        sms: { provider: 'twilio' },
      },
    } as any)
    await orbit.install(core as any)

    expect(core.logger.warn).toHaveBeenCalledWith(
      '[OrbitFlare] Mail service not found or invalid, mail channel disabled'
    )
    expect(core.logger.warn).toHaveBeenCalledWith(
      '[OrbitFlare] Database service not found or invalid, database channel disabled'
    )
    expect(core.logger.warn).toHaveBeenCalledWith(
      '[OrbitFlare] Broadcast service not found or invalid, broadcast channel disabled'
    )
  })

  it('validates configuration options', () => {
    expect(() =>
      OrbitFlare.configure({
        enableSlack: true,
      })
    ).toThrow(/webhookUrl not provided/)

    expect(() =>
      OrbitFlare.configure({
        enableSlack: true,
        channels: { slack: { webhookUrl: 'invalid-url' } },
      })
    ).toThrow(/Invalid Slack webhook URL/)

    expect(() =>
      OrbitFlare.configure({
        enableSms: true,
        channels: { sms: { provider: 'unknown' } },
      })
    ).toThrow(/Unsupported SMS provider/)
  })
})
