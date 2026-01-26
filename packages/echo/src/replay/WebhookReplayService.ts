import type { WebhookDispatcher } from '../send/WebhookDispatcher'
import type { OutgoingWebhookRecord, WebhookStore } from '../storage/WebhookStore'
import type { ReplayOptions, ReplayResult, WebhookDeliveryResult } from '../types'

export class WebhookReplayService {
  constructor(
    private store: WebhookStore,
    private dispatcher: WebhookDispatcher
  ) {}

  async replay(options: ReplayOptions): Promise<ReplayResult> {
    // 查詢符合條件的事件
    const events = await this.store.queryEvents({
      direction: 'outgoing',
      provider: options.provider,
      eventType: options.eventType,
      from: options.timeRange?.from,
      to: options.timeRange?.to,
    })

    // 如果有指定 ID，過濾出這些事件
    const targetEvents = options.eventIds
      ? events.filter((e) => options.eventIds!.includes(e.id!))
      : events

    const result: ReplayResult = {
      total: targetEvents.length,
      replayed: 0,
      skipped: 0,
      failed: 0,
      events: [],
    }

    for (const event of targetEvents) {
      if (event.direction !== 'outgoing') {
        result.skipped++
        result.events.push({
          eventId: event.id!,
          status: 'skipped',
          error: 'Not an outgoing event',
        })
        continue
      }

      const outgoing = event as OutgoingWebhookRecord

      if (options.dryRun) {
        result.replayed++
        result.events.push({
          eventId: event.id!,
          status: 'replayed',
        })
        continue
      }

      try {
        const dispatchResult = await this.dispatcher.dispatch({
          url: options.targetUrl ?? outgoing.url,
          event: outgoing.event,
          data: outgoing.payload,
        })

        if (dispatchResult.success) {
          result.replayed++
          result.events.push({
            eventId: event.id!,
            status: 'replayed',
            result: dispatchResult,
          })
        } else {
          result.failed++
          result.events.push({
            eventId: event.id!,
            status: 'failed',
            result: dispatchResult,
            error: dispatchResult.error,
          })
        }
      } catch (error) {
        result.failed++
        result.events.push({
          eventId: event.id!,
          status: 'failed',
          error: String(error),
        })
      }
    }

    return result
  }
}
