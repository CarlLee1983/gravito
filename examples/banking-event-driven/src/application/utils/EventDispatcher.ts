import type { EventManager } from '@gravito/core'
import type { AggregateRoot } from '@gravito/enterprise'

/**
 * 統一處理聚合根的領域事件派發
 * @param aggregate 聚合根實例
 * @param eventManager 事件管理器
 */
export async function dispatchAggregateEvents(
  aggregate: AggregateRoot<any>,
  eventManager: EventManager
): Promise<void> {
  const events = aggregate.pullDomainEvents()
  for (const event of events) {
    await eventManager.dispatch(event as any)
  }
}
