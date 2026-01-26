import { Job } from '@gravito/stream'
import type { ProgressTracker } from '../core/ProgressTracker'
import type { ShadowProcessor } from '../core/ShadowProcessor'
import type { SitemapGeneratorOptions } from '../core/SitemapGenerator'
import { SitemapGenerator } from '../core/SitemapGenerator'

/**
 * Options for configuring the `GenerateSitemapJob`.
 *
 * @public
 * @since 3.0.0
 */
export interface GenerateSitemapJobOptions {
  /** Options for the underlying sitemap generator. */
  generatorOptions: SitemapGeneratorOptions
  /** Unique identifier for the generation job. */
  jobId: string
  /** Optional progress tracker to monitor execution state. */
  progressTracker?: ProgressTracker
  /** Optional shadow processor for atomic deployments. */
  shadowProcessor?: ShadowProcessor
  /** Optional callback triggered during progress updates. */
  onProgress?: (progress: { processed: number; total: number; percentage: number }) => void
  /** Optional callback triggered when the job completes successfully. */
  onComplete?: () => void
  /** Optional callback triggered when the job encounters an error. */
  onError?: (error: Error) => void
}

/**
 * GenerateSitemapJob is a background task for processing large-scale sitemaps.
 *
 * It integrates with Gravito's `stream` module to provide asynchronous,
 * observable sitemap generation with real-time progress tracking and
 * atomic deployment support.
 *
 * @public
 * @since 3.0.0
 */
export class GenerateSitemapJob extends Job {
  private options: GenerateSitemapJobOptions
  private generator: SitemapGenerator
  private totalEntries = 0
  private processedEntries = 0

  constructor(options: GenerateSitemapJobOptions) {
    super()
    this.options = options
    this.generator = new SitemapGenerator(options.generatorOptions)
  }

  /**
   * Main entry point for the job execution.
   *
   * Orchestrates the full lifecycle of sitemap generation, including progress
   * initialization, generation, shadow commit, and error handling.
   */
  async handle(): Promise<void> {
    const { progressTracker, onComplete, onError } = this.options

    try {
      // Initialize progress tracking
      if (progressTracker) {
        // Calculate total entries (may require traversing all providers)
        const total = await this.calculateTotal()
        await progressTracker.init(this.options.jobId, total)
        this.totalEntries = total
      }

      // Perform generation with progress tracking
      await this.generateWithProgress()

      // Commit shadow operations if any
      if (this.options.shadowProcessor) {
        await this.options.shadowProcessor.commit()
      }

      // Finalize progress tracking
      if (progressTracker) {
        await progressTracker.complete()
      }

      if (onComplete) {
        onComplete()
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))

      // Mark as failed
      if (progressTracker) {
        await progressTracker.fail(err.message)
      }

      if (onError) {
        onError(err)
      }

      throw err
    }
  }

  /**
   * Calculates the total number of URL entries from all providers.
   *
   * @returns A promise resolving to the total entry count.
   */
  private async calculateTotal(): Promise<number> {
    let total = 0
    const { providers } = this.options.generatorOptions

    for (const provider of providers) {
      const entries = await provider.getEntries()

      if (Array.isArray(entries)) {
        total += entries.length
      } else if (entries && typeof (entries as any)[Symbol.asyncIterator] === 'function') {
        // For AsyncIterable, we need to iterate to count (potentially slow)
        // In real-world apps, providers should ideally offer a count() method
        for await (const _ of entries as AsyncIterable<any>) {
          total++
        }
      }
    }

    return total
  }

  /**
   * Performs sitemap generation while reporting progress to the tracker and callback.
   */
  private async generateWithProgress(): Promise<void> {
    const { progressTracker, onProgress } = this.options

    // Execute generation
    await this.generator.run()

    this.processedEntries = this.totalEntries
    if (progressTracker) {
      await progressTracker.update(this.processedEntries, 'processing')
    }
    if (onProgress) {
      onProgress({
        processed: this.processedEntries,
        total: this.totalEntries,
        percentage:
          this.totalEntries > 0
            ? Math.round((this.processedEntries / this.totalEntries) * 100)
            : 100,
      })
    }
  }
}
