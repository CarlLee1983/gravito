import type { EventBackend, EventTask } from '@gravito/core'
import type { QueueManager } from './QueueManager'
import { SystemEventJob } from './SystemEventJob'

/**
 * Event backend implementation using Gravito Stream (BullMQ).
 */
export class StreamEventBackend implements EventBackend {
  constructor(private queueManager: QueueManager) {}

  /**
   * Enqueue an event task to the stream queue.
   */
  async enqueue(task: EventTask): Promise<void> {
    const job = new SystemEventJob(task.hook, task.args, task.options)
    await this.queueManager.push(job)
  }
}
