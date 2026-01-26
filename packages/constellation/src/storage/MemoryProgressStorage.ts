import type { SitemapProgress, SitemapProgressStorage } from '../types'

/**
 * MemoryProgressStorage is a non-persistent, in-memory implementation of the `SitemapProgressStorage`.
 *
 * It is suitable for single-process applications or development environments where
 * persistence of job progress across application restarts is not required.
 *
 * @public
 * @since 3.0.0
 */
export class MemoryProgressStorage implements SitemapProgressStorage {
  private storage = new Map<string, SitemapProgress>()

  /**
   * Retrieves the progress of a specific generation job from memory.
   *
   * @param jobId - Unique identifier for the job.
   * @returns A promise resolving to the `SitemapProgress` object, or null if not found.
   */
  async get(jobId: string): Promise<SitemapProgress | null> {
    const progress = this.storage.get(jobId)
    return progress ? { ...progress } : null
  }

  /**
   * Initializes or overwrites a progress record in memory.
   *
   * @param jobId - Unique identifier for the job.
   * @param progress - The initial or current state of the job progress.
   */
  async set(jobId: string, progress: SitemapProgress): Promise<void> {
    this.storage.set(jobId, { ...progress })
  }

  /**
   * Updates specific fields of an existing progress record in memory.
   *
   * @param jobId - Unique identifier for the job.
   * @param updates - Object containing the fields to update.
   */
  async update(jobId: string, updates: Partial<SitemapProgress>): Promise<void> {
    const existing = this.storage.get(jobId)
    if (existing) {
      this.storage.set(jobId, { ...existing, ...updates })
    }
  }

  /**
   * Deletes a progress record from memory.
   *
   * @param jobId - Unique identifier for the job to remove.
   */
  async delete(jobId: string): Promise<void> {
    this.storage.delete(jobId)
  }

  /**
   * Lists the most recent sitemap generation jobs from memory.
   *
   * @param limit - Maximum number of records to return.
   * @returns A promise resolving to an array of `SitemapProgress` objects, sorted by start time.
   */
  async list(limit?: number): Promise<SitemapProgress[]> {
    const all = Array.from(this.storage.values())
    const sorted = all.sort((a, b) => {
      const aTime = a.startTime?.getTime() || 0
      const bTime = b.startTime?.getTime() || 0
      return bTime - aTime // Latest first
    })

    return limit ? sorted.slice(0, limit) : sorted
  }
}
