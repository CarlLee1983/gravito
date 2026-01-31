/**
 * Hook Emitter 輔助工具
 *
 * 提供型別安全的 hook emit 功能，封裝底層 @gravito/core 的 hooks 系統。
 *
 * @packageDocumentation
 */

import type { PlanetCore } from '@gravito/core'
import type { FlareHookEvent, FlareHookPayloads } from '../types/hooks'

/**
 * 型別安全的 Hook Emitter
 *
 * 封裝 PlanetCore 的 hooks.emit，提供完整的型別檢查和 IntelliSense 支援。
 *
 * @public
 */
export interface HookEmitter {
  /**
   * 發送 hook 事件
   *
   * @param event - 事件名稱
   * @param payload - 事件 payload，型別由事件名稱決定
   * @returns Promise，在所有監聽器執行完成後 resolve
   *
   * @example
   * ```typescript
   * const emitter = createHookEmitter(core)
   * await emitter.emit('notification:sending', {
   *   notification,
   *   notifiable,
   *   channels: ['mail', 'sms']
   * })
   * ```
   */
  emit<E extends FlareHookEvent>(event: E, payload: FlareHookPayloads[E]): Promise<void>
}

/**
 * 建立型別安全的 hook emitter
 *
 * 將 PlanetCore 的 hooks 系統包裝成型別安全的 emitter，
 * 避免在 NotificationManager 中使用 `any` 型別斷言。
 *
 * @param core - PlanetCore 實例
 * @returns 型別安全的 HookEmitter 實例
 *
 * @example
 * ```typescript
 * export class NotificationManager {
 *   private hookEmitter: HookEmitter
 *
 *   constructor(private core: PlanetCore) {
 *     this.hookEmitter = createHookEmitter(core)
 *   }
 *
 *   async send(notifiable: Notifiable, notification: Notification) {
 *     await this.hookEmitter.emit('notification:sending', {
 *       notification,
 *       notifiable,
 *       channels: notification.via(notifiable)
 *     })
 *     // ...
 *   }
 * }
 * ```
 *
 * @public
 */
export function createHookEmitter(core: PlanetCore): HookEmitter {
  return {
    emit: async <E extends FlareHookEvent>(
      event: E,
      payload: FlareHookPayloads[E]
    ): Promise<void> => {
      // 使用 core.hooks.emit，但透過此函數獲得型別檢查
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (core.hooks as any).emit(event, payload)
    },
  }
}
