import type { EventSource } from './types'

/**
 * 事件處理器類型
 */
export type EventHandler<T = any> = (payload: T, source?: EventSource) => Promise<void> | void

/**
 * 事件訂閱資訊
 */
interface EventSubscription {
  handler: EventHandler
  once?: boolean
}

/**
 * Event Bus - 明確的事件追蹤和管理系統
 *
 * 提供明確的事件觸發點追蹤，讓開發者清楚知道事件在哪裡觸發
 */
export class EventBus {
  private handlers: Map<string, EventSubscription[]> = new Map()
  private eventHistory: Array<{
    event: string
    payload: unknown
    source?: EventSource
    timestamp: number
  }> = []
  private maxHistorySize = 1000

  /**
   * 發送事件（帶來源追蹤）
   */
  emit<T = any>(event: string, payload: T, source?: EventSource): void {
    const subscriptions = this.handlers.get(event) || []
    const timestamp = Date.now()

    // 記錄事件歷史
    this.eventHistory.push({ event, payload, source, timestamp })
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift()
    }

    // 執行所有訂閱的處理器
    for (const subscription of subscriptions) {
      try {
        const result = subscription.handler(payload, source)
        if (result instanceof Promise) {
          // 非同步執行，不等待
          result.catch((error) => {
            console.error(`[EventBus] Error in handler for event '${event}':`, error)
          })
        }
      } catch (error) {
        console.error(`[EventBus] Error in handler for event '${event}':`, error)
      }

      // 如果是一次性訂閱，移除它
      if (subscription.once) {
        this.off(event, subscription.handler)
      }
    }
  }

  /**
   * 訂閱事件
   */
  on<T = any>(event: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, [])
    }
    this.handlers.get(event)!.push({ handler })
  }

  /**
   * 訂閱事件（只執行一次）
   */
  once<T = any>(event: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, [])
    }
    this.handlers.get(event)!.push({ handler, once: true })
  }

  /**
   * 取消訂閱
   */
  off<T = any>(event: string, handler: EventHandler<T>): void {
    const subscriptions = this.handlers.get(event)
    if (!subscriptions) return

    const filtered = subscriptions.filter((sub) => sub.handler !== handler)
    if (filtered.length === 0) {
      this.handlers.delete(event)
    } else {
      this.handlers.set(event, filtered)
    }
  }

  /**
   * 移除所有訂閱
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.handlers.delete(event)
    } else {
      this.handlers.clear()
    }
  }

  /**
   * 獲取事件歷史
   */
  getHistory(event?: string): Array<{
    event: string
    payload: unknown
    source?: EventSource
    timestamp: number
  }> {
    if (event) {
      return this.eventHistory.filter((e) => e.event === event)
    }
    return [...this.eventHistory]
  }

  /**
   * 清除事件歷史
   */
  clearHistory(): void {
    this.eventHistory = []
  }

  /**
   * 獲取事件來源資訊（從調用堆疊）
   */
  static getEventSource(): EventSource {
    const stack = new Error().stack
    if (!stack) {
      return {}
    }

    const lines = stack.split('\n')
    // 跳過前兩行（Error 和 getEventSource）
    if (lines.length > 2) {
      const callerLine = lines[2]
      // 嘗試解析檔案和行號
      const match = callerLine.match(/at\s+(.+?):(\d+):(\d+)/)
      if (match) {
        return {
          file: match[1],
          line: parseInt(match[2], 10),
          stack: callerLine,
        }
      }
    }

    return { stack }
  }
}
