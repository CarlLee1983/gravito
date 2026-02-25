import type { Job } from '../Job'

/**
 * ConsumerStrategy defines the contract for different job consumption modes.
 *
 * Implementations handle the scheduling and fetching of jobs from the queue.
 * This allows pluggable consumption strategies: polling, reactive, hybrid, etc.
 *
 * @public
 */
export interface ConsumerStrategy {
  /**
   * Starts the consumption strategy.
   *
   * Initiates the job fetching loop based on the specific strategy implementation.
   *
   * @returns A promise that resolves when the strategy loop has started.
   */
  start(): Promise<void>

  /**
   * Stops the consumption strategy gracefully.
   *
   * Signals the strategy to stop accepting new jobs and clean up resources.
   *
   * @returns A promise that resolves when the strategy has fully stopped.
   */
  stop(): Promise<void>

  /**
   * Checks if the strategy is currently active.
   *
   * @returns True if the strategy loop is running.
   */
  isRunning(): boolean

  /**
   * Called by the consumer loop to fetch the next batch of jobs.
   *
   * The strategy determines how to fetch jobs (blocking, non-blocking, reactive, etc.).
   *
   * @returns An array of jobs to process, or empty array if no jobs are available.
   */
  fetchJobs(): Promise<Job[]>
}
