import { beforeEach, describe, expect, it, jest, mock } from 'bun:test'
import { Notification, type ShouldQueue } from '../src/Notification'
import { NotificationManager } from '../src/NotificationManager'
import type { MailMessage, Notifiable } from '../src/types'

// Mock 通知（可序列化）
class ValidNotification extends Notification implements ShouldQueue {
  queue = 'notifications'

  constructor(public message: string) {
    super()
  }

  via(_notifiable: Notifiable): string[] {
    return ['mail']
  }

  toMail(_notifiable: Notifiable): MailMessage {
    return {
      subject: 'Test',
      text: this.message,
    }
  }
}

// Mock 通知（不可序列化 - 包含函式）
class InvalidNotification extends Notification implements ShouldQueue {
  queue = 'notifications'

  constructor(
    public message: string,
    public callback: () => void
  ) {
    super()
  }

  via(_notifiable: Notifiable): string[] {
    return ['mail']
  }

  toMail(_notifiable: Notifiable): MailMessage {
    return {
      subject: 'Test',
      text: this.message,
    }
  }
}

// Mock Notifiable
class MockUser implements Notifiable {
  constructor(private id: string) {}

  getNotifiableId(): string {
    return this.id
  }

  getNotifiableType(): string {
    return 'user'
  }
}

describe('NotificationManager - 序列化整合', () => {
  let manager: NotificationManager
  let queueManager: {
    push: ReturnType<typeof mock>
  }
  let notifiable: Notifiable

  beforeEach(() => {
    const core = {
      logger: { warn: jest.fn(), error: jest.fn() },
      hooks: { emit: jest.fn() },
    }
    manager = new NotificationManager(core as any)

    // Mock queue manager
    queueManager = {
      push: mock(() => Promise.resolve()),
    }
    manager.setQueueManager(queueManager)

    notifiable = new MockUser('123')
  })

  describe('可序列化通知', () => {
    it('應該成功序列化並推送到佇列', async () => {
      const notification = new ValidNotification('Test message')

      await manager.send(notifiable, notification)

      expect(queueManager.push).toHaveBeenCalled()
      const callArgs = queueManager.push.mock.calls[0]
      const job = callArgs[0] as any

      // 驗證序列化後的資料不包含函式
      expect(job.notificationData).toBeDefined()
      expect(job.notificationData.message).toBe('Test message')
      expect(typeof job.notificationData.callback).not.toBe('function')
    })

    it('序列化資料應該只包含公開屬性', async () => {
      const notification = new ValidNotification('Test')

      await manager.send(notifiable, notification)

      const callArgs = queueManager.push.mock.calls[0]
      const job = callArgs[0] as any

      // 不應該包含私有屬性（底線開頭）
      expect(Object.keys(job.notificationData).every((key) => !key.startsWith('_'))).toBe(true)
    })
  })

  describe('不可序列化通知（可選功能）', () => {
    it('當通知包含不可序列化屬性時，應該記錄警告（目前行為）', async () => {
      const callback = () => {
        console.log('test')
      }
      const notification = new InvalidNotification('Test', callback)

      // 目前實作會序列化但會過濾掉函式
      await manager.send(notifiable, notification)

      expect(queueManager.push).toHaveBeenCalled()
      const callArgs = queueManager.push.mock.calls[0]
      const job = callArgs[0] as any

      // 函式應該被過濾掉
      expect(job.notificationData.callback).toBeUndefined()
    })
  })

  describe('循環引用處理', () => {
    it('應該能處理循環引用', async () => {
      class CircularNotification extends Notification implements ShouldQueue {
        queue = 'notifications'
        public self: any

        constructor(public message: string) {
          super()
          this.self = this // 循環引用
        }

        via(_notifiable: Notifiable): string[] {
          return ['mail']
        }

        toMail(_notifiable: Notifiable): MailMessage {
          return {
            subject: 'Test',
            text: this.message,
          }
        }
      }

      const notification = new CircularNotification('Test')

      await manager.send(notifiable, notification)

      expect(queueManager.push).toHaveBeenCalled()
      const callArgs = queueManager.push.mock.calls[0]
      const job = callArgs[0] as any

      // 循環引用應該被標記為 [Circular]
      expect(job.notificationData.self).toBe('[Circular]')
    })
  })

  describe('特殊型別序列化', () => {
    it('應該正確序列化 Date', async () => {
      class DateNotification extends Notification implements ShouldQueue {
        queue = 'notifications'

        constructor(public createdAt: Date) {
          super()
        }

        via(_notifiable: Notifiable): string[] {
          return ['mail']
        }

        toMail(_notifiable: Notifiable): MailMessage {
          return {
            subject: 'Test',
            text: 'Test',
          }
        }
      }

      const date = new Date('2025-01-31T10:00:00Z')
      const notification = new DateNotification(date)

      await manager.send(notifiable, notification)

      const callArgs = queueManager.push.mock.calls[0]
      const job = callArgs[0] as any

      // Date 應該被序列化為特殊格式
      expect(job.notificationData.createdAt).toEqual({
        __type: 'Date',
        value: date.toISOString(),
      })
    })

    it('應該正確序列化 Map 和 Set', async () => {
      class CollectionNotification extends Notification implements ShouldQueue {
        queue = 'notifications'

        constructor(
          public tags: Set<string>,
          public metadata: Map<string, string>
        ) {
          super()
        }

        via(_notifiable: Notifiable): string[] {
          return ['mail']
        }

        toMail(_notifiable: Notifiable): MailMessage {
          return {
            subject: 'Test',
            text: 'Test',
          }
        }
      }

      const notification = new CollectionNotification(
        new Set(['admin', 'user']),
        new Map([['key', 'value']])
      )

      await manager.send(notifiable, notification)

      const callArgs = queueManager.push.mock.calls[0]
      const job = callArgs[0] as any

      expect(job.notificationData.tags.__type).toBe('Set')
      expect(job.notificationData.metadata.__type).toBe('Map')
    })
  })
})
