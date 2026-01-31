/**
 * FlareHooks 型別安全性測試
 *
 * 測試 hook 型別定義和 hookEmitter 的型別安全性。
 */

import type { PlanetCore } from '@gravito/core'
import { describe, expect, it, vi } from 'vitest'
import { Notification } from '../src/Notification'
import type { Notifiable } from '../src/types'
import type { FlareHookPayloads } from '../src/types/hooks'
import { createHookEmitter } from '../src/utils/hookEmitter'

// Mock Notification 類別
class TestNotification extends Notification {
  via(_notifiable: Notifiable): string[] {
    return ['mail']
  }
}

// Mock Notifiable
const mockNotifiable: Notifiable = {
  getNotifiableId: () => 1,
  getNotifiableType: () => 'user',
}

// Mock PlanetCore
const createMockCore = (): PlanetCore => {
  return {
    hooks: {
      emit: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      off: vi.fn(),
    },
  } as unknown as PlanetCore
}

describe('FlareHooks Type Safety', () => {
  describe('createHookEmitter', () => {
    it('應該建立型別安全的 hook emitter', () => {
      const core = createMockCore()
      const emitter = createHookEmitter(core)

      expect(emitter).toBeDefined()
      expect(emitter.emit).toBeInstanceOf(Function)
    })

    it('應該正確發送 notification:sending 事件', async () => {
      const core = createMockCore()
      const emitter = createHookEmitter(core)
      const notification = new TestNotification()

      const payload: FlareHookPayloads['notification:sending'] = {
        notification,
        notifiable: mockNotifiable,
        channels: ['mail', 'sms'],
      }

      await emitter.emit('notification:sending', payload)

      expect(core.hooks.emit).toHaveBeenCalledWith('notification:sending', payload)
    })

    it('應該正確發送 notification:queued 事件', async () => {
      const core = createMockCore()
      const emitter = createHookEmitter(core)
      const notification = new TestNotification()

      const payload: FlareHookPayloads['notification:queued'] = {
        notification,
        notifiable: mockNotifiable,
        channels: ['mail'],
      }

      await emitter.emit('notification:queued', payload)

      expect(core.hooks.emit).toHaveBeenCalledWith('notification:queued', payload)
    })

    it('應該正確發送 notification:sent 事件', async () => {
      const core = createMockCore()
      const emitter = createHookEmitter(core)
      const notification = new TestNotification()

      const payload: FlareHookPayloads['notification:sent'] = {
        notification,
        notifiable: mockNotifiable,
        results: [{ success: true, channel: 'mail', duration: 100 }],
        allSuccess: true,
        totalDuration: 100,
      }

      await emitter.emit('notification:sent', payload)

      expect(core.hooks.emit).toHaveBeenCalledWith('notification:sent', payload)
    })

    it('應該正確發送 notification:channel:sending 事件', async () => {
      const core = createMockCore()
      const emitter = createHookEmitter(core)
      const notification = new TestNotification()

      const payload: FlareHookPayloads['notification:channel:sending'] = {
        notification,
        notifiable: mockNotifiable,
        channel: 'mail',
      }

      await emitter.emit('notification:channel:sending', payload)

      expect(core.hooks.emit).toHaveBeenCalledWith('notification:channel:sending', payload)
    })

    it('應該正確發送 notification:channel:sent 事件', async () => {
      const core = createMockCore()
      const emitter = createHookEmitter(core)
      const notification = new TestNotification()

      const payload: FlareHookPayloads['notification:channel:sent'] = {
        notification,
        notifiable: mockNotifiable,
        channel: 'mail',
        duration: 50,
      }

      await emitter.emit('notification:channel:sent', payload)

      expect(core.hooks.emit).toHaveBeenCalledWith('notification:channel:sent', payload)
    })

    it('應該正確發送 notification:channel:failed 事件', async () => {
      const core = createMockCore()
      const emitter = createHookEmitter(core)
      const notification = new TestNotification()
      const error = new Error('Send failed')

      const payload: FlareHookPayloads['notification:channel:failed'] = {
        notification,
        notifiable: mockNotifiable,
        channel: 'mail',
        error,
        duration: 50,
      }

      await emitter.emit('notification:channel:failed', payload)

      expect(core.hooks.emit).toHaveBeenCalledWith('notification:channel:failed', payload)
    })

    it('應該正確發送 notification:channel:retry 事件', async () => {
      const core = createMockCore()
      const emitter = createHookEmitter(core)
      const notification = new TestNotification()
      const error = new Error('Temporary failure')

      const payload: FlareHookPayloads['notification:channel:retry'] = {
        notification,
        notifiable: mockNotifiable,
        channel: 'mail',
        error,
        attempt: 2,
        nextDelay: 2000,
      }

      await emitter.emit('notification:channel:retry', payload)

      expect(core.hooks.emit).toHaveBeenCalledWith('notification:channel:retry', payload)
    })

    it('應該正確發送 notification:batch:start 事件', async () => {
      const core = createMockCore()
      const emitter = createHookEmitter(core)
      const notification = new TestNotification()

      const payload: FlareHookPayloads['notification:batch:start'] = {
        notification,
        count: 100,
      }

      await emitter.emit('notification:batch:start', payload)

      expect(core.hooks.emit).toHaveBeenCalledWith('notification:batch:start', payload)
    })

    it('應該正確發送 notification:batch:complete 事件', async () => {
      const core = createMockCore()
      const emitter = createHookEmitter(core)
      const notification = new TestNotification()

      const payload: FlareHookPayloads['notification:batch:complete'] = {
        notification,
        total: 100,
        success: 95,
        failed: 5,
        duration: 5000,
      }

      await emitter.emit('notification:batch:complete', payload)

      expect(core.hooks.emit).toHaveBeenCalledWith('notification:batch:complete', payload)
    })

    it('應該在底層 emit 拋出錯誤時正確傳遞錯誤', async () => {
      const error = new Error('Hook error')
      const core = {
        hooks: {
          emit: vi.fn().mockRejectedValue(error),
          on: vi.fn(),
          off: vi.fn(),
        },
      } as unknown as PlanetCore

      const emitter = createHookEmitter(core)
      const notification = new TestNotification()

      const payload: FlareHookPayloads['notification:sending'] = {
        notification,
        notifiable: mockNotifiable,
        channels: ['mail'],
      }

      await expect(emitter.emit('notification:sending', payload)).rejects.toThrow('Hook error')
    })
  })

  describe('Type Checking (編譯時測試)', () => {
    it('應該在編譯時拒絕錯誤的 payload 型別', () => {
      const core = createMockCore()
      const emitter = createHookEmitter(core)
      const notification = new TestNotification()

      // 這些測試案例應該在 TypeScript 編譯時失敗
      // 我們使用 @ts-expect-error 來驗證型別檢查是否正常運作

      // @ts-expect-error - 缺少必要欄位
      emitter.emit('notification:sending', {
        notification,
        // 缺少 notifiable 和 channels
      })

      // @ts-expect-error - 錯誤的欄位型別
      emitter.emit('notification:sent', {
        notification,
        notifiable: mockNotifiable,
        results: 'invalid', // 應該是陣列
        allSuccess: true,
        totalDuration: 100,
      })

      // @ts-expect-error - 使用不存在的事件名稱
      emitter.emit('notification:invalid', {
        notification,
      })

      // 這個測試用於確保 @ts-expect-error 能正常運作
      expect(true).toBe(true)
    })
  })
})
