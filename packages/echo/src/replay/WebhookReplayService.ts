import type { WebhookDispatcher } from '../send/WebhookDispatcher'
import type { OutgoingWebhookRecord, WebhookStore } from '../storage/WebhookStore'
import type { ReplayOptions, ReplayResult } from '../types'

/**
 * Service responsible for re-sending previously dispatched webhook events.
 * This is useful for recovering from downstream outages or re-syncing data.
 *
 * @example
 * ```typescript
 * const replayService = new WebhookReplayService(store, dispatcher);
 * const result = await replayService.replay({
 *   timeRange: { from: new Date('2023-01-01'), to: new Date('2023-01-02') },
 *   provider: 'stripe'
 * });
 * ```
 */
export class WebhookReplayService {
  /**
   * Creates an instance of WebhookReplayService.
   *
   * @param store - The storage backend to query historical events.
   * @param dispatcher - The dispatcher used to re-send events.
   */
  constructor(
    private store: WebhookStore,
    private dispatcher: WebhookDispatcher
  ) {}

  /**
   * Replays webhook events based on the provided options.
   *
   * @param options - Criteria for selecting events and execution mode (e.g., dry run).
   * @returns A summary of the replay operation, including success and failure counts.
   * @throws {Error} If the storage query fails.
   */
  async replay(options: ReplayOptions): Promise<ReplayResult> {
    // Query events matching the criteria
    const events = await this.store.queryEvents({
      direction: 'outgoing',
      provider: options.provider,
      eventType: options.eventType,
      from: options.timeRange?.from,
      to: options.timeRange?.to,
    })

    // Filter by specific IDs if provided
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
