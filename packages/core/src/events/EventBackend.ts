import type { EventTask } from './types'

/**
 * Interface for event dispatch backends.
 */
export interface EventBackend {
  /**
   * Enqueue an event for processing.
   * @param task - The event task to process
   */
  enqueue(task: EventTask): Promise<void> | void
}
