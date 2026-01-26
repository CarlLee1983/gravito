/**
 * Mutex is a simple mutual exclusion lock for managing concurrent async operations.
 *
 * It ensures that only one task can run a specific block of code at a time,
 * which is critical for preventing race conditions in storage and generation tasks.
 *
 * @public
 * @since 3.0.0
 */
export class Mutex {
  private queue: Promise<any> = Promise.resolve()

  /**
   * Executes a function exclusively, ensuring no other task can run it concurrently.
   *
   * @param fn - The async function to execute.
   * @returns A promise resolving to the result of the function.
   */
  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(() => fn())
    this.queue = next.then(
      () => {},
      () => {}
    )
    return next
  }
}
