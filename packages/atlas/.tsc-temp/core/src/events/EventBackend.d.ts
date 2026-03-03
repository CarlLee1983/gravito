import type { EventTask } from './types'
/**
 * Interface for event dispatch backends.
 */
export interface EventBackend {
  /**
   * Enqueue an event for processing.
   * @param task - The event task to process
   * @returns Task ID or 'dropped' if event was rejected (can be async for some backends)
   */
  enqueue(task: EventTask): string | Promise<void>
}
