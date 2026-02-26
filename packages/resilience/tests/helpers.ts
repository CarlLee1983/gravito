import type { EventTask } from '@gravito/core'

/**
 * 延遲函式，用於測試中的時間操作
 */
export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 內部計數器，用於生成唯一的任務 ID
 */
let _taskCounter = 0

/**
 * 建立測試用的 EventTask 物件
 * @param hook - 事件 hook 名稱
 * @param priority - 優先級（'critical' | 'high' | 'normal' | 'low'，預設 'normal'）
 * @param overrides - 覆蓋的屬性
 * @returns 測試用 EventTask
 */
export const makeEventTask = (
  hook: string,
  priority = 'normal',
  overrides: Partial<EventTask> = {}
): EventTask => ({
  id: `test-task-${++_taskCounter}`,
  hook,
  args: {},
  options: {
    priority,
    escalation: { enabled: false },
  },
  callbacks: [],
  createdAt: Date.now(),
  enqueuedAt: Date.now(),
  retryCount: 0,
  ...(overrides as Record<string, unknown>),
})

/**
 * 重置任務計數器（用於測試開始前清理）
 */
export const resetTaskCounter = (): void => {
  _taskCounter = 0
}

/**
 * 建立指定數量的測試事件任務
 * @param count - 任務數量
 * @param hookPrefix - hook 名稱前綴
 * @param priority - 優先級
 * @returns 任務陣列
 */
export const makeTasks = (
  count: number,
  hookPrefix = 'test-hook',
  priority = 'normal'
): EventTask[] =>
  Array.from({ length: count }, (_v, i) => makeEventTask(`${hookPrefix}-${i}`, priority))

/**
 * 模擬延遲的操作（用於測試非同步行為）
 */
export const createAsyncOperation = <T>(result: T, delayMs = 10): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(result), delayMs))
