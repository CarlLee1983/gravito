import type { DeadLetterQueue, DLQEntry, DLQFilter } from '@gravito/core'
import pc from 'picocolors'

/**
 * Dead Letter Queue Management Command
 *
 * Provides operations for managing failed events in the Dead Letter Queue:
 * - List DLQ entries with filtering
 * - Requeue individual or batched failed events
 * - Clear DLQ entries
 *
 * @example
 * ```typescript
 * const dlqCommand = new EventDLQCommand(core.dlq)
 *
 * // List all DLQ entries
 * await dlqCommand.list({})
 *
 * // List entries for a specific event
 * await dlqCommand.list({ eventName: 'order:created' })
 *
 * // Requeue a specific DLQ entry
 * await dlqCommand.requeue('dlq-1-1706000000000')
 *
 * // Requeue all entries for an event
 * await dlqCommand.requeueAll({ eventName: 'order:created' })
 *
 * // Clear all DLQ entries
 * await dlqCommand.clear()
 * ```
 *
 * @since 1.2.0
 * @public
 */
export class EventDLQCommand {
  constructor(private dlq: DeadLetterQueue) {}

  /**
   * List Dead Letter Queue entries.
   *
   * @param filter - Filter options for DLQ entries
   * @param options - Display options
   */
  async list(filter: DLQFilter = {}, options: { json?: boolean } = {}): Promise<void> {
    const entries = this.dlq.list(filter)

    if (entries.length === 0) {
      console.log(pc.yellow('No DLQ entries found.'))
      return
    }

    if (options.json) {
      console.log(JSON.stringify(entries, null, 2))
      return
    }

    // Display as table
    console.log(pc.bold('\n📋 Dead Letter Queue Entries'))
    console.log(pc.gray('─'.repeat(120)))

    const headers = ['ID', 'Event', 'Retries', 'Failed At', 'Error Message']
    console.log(headers.map((h) => pc.bold(h)).join(' │ '))
    console.log(pc.gray('─'.repeat(120)))

    for (const entry of entries) {
      const failedAt = new Date(entry.failedAt).toISOString()
      const errorMsg = entry.error.message.substring(0, 40)

      console.log(
        [
          entry.id.substring(0, 15),
          entry.eventName,
          String(entry.retryCount),
          failedAt,
          errorMsg,
        ].join(' │ ')
      )
    }

    console.log(pc.gray('─'.repeat(120)))
    console.log(pc.green(`Total: ${entries.length} entries`))
    console.log()
  }

  /**
   * Get details of a specific DLQ entry.
   *
   * @param entryId - DLQ entry ID
   */
  async show(entryId: string): Promise<void> {
    const entry = this.dlq.get(entryId)

    if (!entry) {
      console.log(pc.red(`Entry not found: ${entryId}`))
      return
    }

    console.log(pc.bold('\n📄 DLQ Entry Details'))
    console.log(pc.gray('─'.repeat(80)))

    const details = [
      ['ID', entry.id],
      ['Event', entry.eventName],
      ['Retry Count', String(entry.retryCount)],
      ['First Failed At', new Date(entry.firstFailedAt).toISOString()],
      ['Failed At', new Date(entry.failedAt).toISOString()],
      [
        'Last Retried At',
        entry.lastRetriedAt ? new Date(entry.lastRetriedAt).toISOString() : 'Never',
      ],
      ['Error Code', entry.error.code || 'N/A'],
      ['Error Message', entry.error.message],
    ]

    for (const [key, value] of details) {
      console.log(`${pc.bold(key.padEnd(20))}: ${value}`)
    }

    console.log(pc.gray('─'.repeat(80)))

    console.log(pc.bold('\nPayload:'))
    console.log(JSON.stringify(entry.payload, null, 2))

    if (entry.error.stack) {
      console.log(pc.bold('\nStack Trace:'))
      console.log(pc.gray(entry.error.stack))
    }

    console.log()
  }

  /**
   * Requeue a specific DLQ entry.
   *
   * @param entryId - DLQ entry ID
   * @param handler - Event handler to execute
   */
  async requeue(entryId: string, handler: (entry: DLQEntry) => Promise<void>): Promise<void> {
    const entry = this.dlq.get(entryId)

    if (!entry) {
      console.log(pc.red(`Entry not found: ${entryId}`))
      return
    }

    try {
      await handler(entry)
      this.dlq.delete(entryId)
      console.log(pc.green(`✅ Successfully requeued: ${entry.eventName} (${entryId})`))
    } catch (error) {
      console.log(pc.red(`❌ Failed to requeue: ${(error as Error).message}`))
    }
  }

  /**
   * Requeue all DLQ entries matching filter.
   *
   * @param filter - Filter options
   * @param handler - Event handler to execute
   */
  async requeueAll(filter: DLQFilter, handler: (entry: DLQEntry) => Promise<void>): Promise<void> {
    const entries = this.dlq.list(filter)

    if (entries.length === 0) {
      console.log(pc.yellow('No entries found to requeue.'))
      return
    }

    console.log(pc.cyan(`🔄 Requeuing ${entries.length} entries...`))

    let successCount = 0
    let failureCount = 0

    for (const entry of entries) {
      try {
        await handler(entry)
        this.dlq.delete(entry.id)
        successCount++
      } catch (error) {
        failureCount++
        console.log(
          pc.yellow(`  ⚠️  Failed: ${entry.eventName} (${entry.id}): ${(error as Error).message}`)
        )
      }
    }

    console.log(pc.green(`\n✅ Requeue completed:`))
    console.log(`  ✓ Success: ${successCount}`)
    console.log(`  ✗ Failed: ${failureCount}`)
    console.log()
  }

  /**
   * Delete a specific DLQ entry.
   *
   * @param entryId - DLQ entry ID
   */
  async delete(entryId: string): Promise<void> {
    const result = this.dlq.delete(entryId)

    if (result) {
      console.log(pc.green(`✅ Deleted entry: ${entryId}`))
    } else {
      console.log(pc.red(`Entry not found: ${entryId}`))
    }
  }

  /**
   * Delete all DLQ entries matching filter.
   *
   * @param filter - Filter options
   * @param confirm - Whether to skip confirmation
   */
  async deleteAll(filter: DLQFilter, confirm = false): Promise<void> {
    const entries = this.dlq.list(filter)

    if (entries.length === 0) {
      console.log(pc.yellow('No entries found.'))
      return
    }

    const summary = filter.eventName ? `event '${filter.eventName}'` : 'all'

    console.log(pc.yellow(`⚠️  This will delete ${entries.length} entries for ${summary}.`))

    if (!confirm) {
      console.log(pc.cyan('Use --force to confirm'))
      return
    }

    const deleted = this.dlq.deleteAll(filter)
    console.log(pc.green(`✅ Deleted ${deleted} entries`))
  }

  /**
   * Get DLQ statistics.
   */
  async stats(): Promise<void> {
    const totalCount = this.dlq.getCount()

    if (totalCount === 0) {
      console.log(pc.yellow('DLQ is empty.'))
      return
    }

    console.log(pc.bold('\n📊 DLQ Statistics'))
    console.log(pc.gray('─'.repeat(50)))

    // Get entries grouped by event name
    const allEntries = this.dlq.list()
    const byEvent: Record<string, number> = {}

    for (const entry of allEntries) {
      byEvent[entry.eventName] = (byEvent[entry.eventName] || 0) + 1
    }

    console.log(`Total DLQ Entries: ${pc.bold(String(totalCount))}`)
    console.log(pc.gray('\nBy Event Type:'))

    for (const [event, count] of Object.entries(byEvent).sort((a, b) => b[1] - a[1])) {
      const percentage = ((count / totalCount) * 100).toFixed(1)
      console.log(`  ${event.padEnd(30)}: ${String(count).padStart(5)} (${percentage}%)`)
    }

    console.log(pc.gray('─'.repeat(50)))
    console.log()
  }
}
