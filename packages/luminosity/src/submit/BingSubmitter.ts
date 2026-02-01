import { createRateLimiter, type RateLimitConfig, type RateLimiter } from './RateLimiter'

/**
 * Configuration for Bing IndexNow submitter.
 *
 * @public
 * @since 3.1.0
 */
export interface BingSubmitterConfig {
  /** Your IndexNow API key. */
  apiKey: string
  /** Your website host (e.g., 'example.com'). */
  host: string
  /** Optional rate limiting configuration. */
  rateLimit?: RateLimitConfig
  /** Custom IndexNow endpoint (default: Bing). */
  endpoint?: string
}

/**
 * Result of a submission attempt.
 *
 * @public
 * @since 3.1.0
 */
export interface SubmitResult {
  /** Whether the submission succeeded. */
  success: boolean
  /** Number of URLs submitted. */
  urlCount: number
  /** Error message if failed. */
  error?: string
  /** HTTP status code. */
  statusCode?: number
}

/**
 * Bing IndexNow submitter.
 *
 * Submits URLs to Bing using the IndexNow protocol, which is a simple
 * way to notify search engines about content changes.
 *
 * @public
 * @since 3.1.0
 *
 * @example
 * ```typescript
 * const submitter = new BingSubmitter({
 *   apiKey: 'your-api-key',
 *   host: 'example.com'
 * });
 *
 * const result = await submitter.submitUrls([
 *   'https://example.com/page1',
 *   'https://example.com/page2'
 * ]);
 *
 * if (result.success) {
 *   console.log(`Submitted ${result.urlCount} URLs`);
 * }
 * ```
 */
export class BingSubmitter {
  private rateLimiter?: RateLimiter
  private endpoint: string

  constructor(private config: BingSubmitterConfig) {
    this.endpoint = config.endpoint || 'https://api.indexnow.org/indexnow'

    if (config.rateLimit) {
      this.rateLimiter = createRateLimiter(config.rateLimit)
    }
  }

  /**
   * Submit a batch of URLs to Bing IndexNow.
   *
   * According to IndexNow spec:
   * - Maximum 10,000 URLs per request
   * - URLs must be from the same host
   * - Host must match the API key owner
   *
   * @param urls - Array of URLs to submit.
   * @returns Submission result.
   * @throws {Error} If submission fails after retries.
   *
   * @example
   * ```typescript
   * const result = await submitter.submitUrls([
   *   'https://example.com/new-page',
   *   'https://example.com/updated-page'
   * ]);
   * ```
   */
  async submitUrls(urls: string[]): Promise<SubmitResult> {
    if (urls.length === 0) {
      return {
        success: true,
        urlCount: 0,
      }
    }

    // Validate URLs belong to the same host
    const invalidUrls = urls.filter((url) => {
      try {
        const parsed = new URL(url)
        return parsed.hostname !== this.config.host
      } catch {
        return true
      }
    })

    if (invalidUrls.length > 0) {
      return {
        success: false,
        urlCount: 0,
        error: `${invalidUrls.length} URLs do not match host ${this.config.host}`,
      }
    }

    // Split into batches of 10,000
    const batches = this.chunkArray(urls, 10000)
    const results: SubmitResult[] = []

    for (const batch of batches) {
      if (this.rateLimiter) {
        await this.rateLimiter.acquire()
      }

      const result = await this.submitBatch(batch)
      results.push(result)

      if (!result.success) {
        // Stop on first failure
        return result
      }
    }

    // Aggregate results
    return {
      success: true,
      urlCount: results.reduce((sum, r) => sum + r.urlCount, 0),
    }
  }

  /**
   * Submit a single batch (internal method).
   * @private
   */
  private async submitBatch(urls: string[]): Promise<SubmitResult> {
    const payload = {
      host: this.config.host,
      key: this.config.apiKey,
      urlList: urls,
    }

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        return {
          success: true,
          urlCount: urls.length,
          statusCode: response.status,
        }
      }

      const errorText = await response.text().catch(() => 'Unknown error')

      return {
        success: false,
        urlCount: 0,
        error: `HTTP ${response.status}: ${errorText}`,
        statusCode: response.status,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        urlCount: 0,
        error: `Network error: ${message}`,
      }
    }
  }

  /**
   * Chunk an array into smaller arrays.
   * @private
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  /**
   * Validate the API key with a test submission.
   *
   * @returns True if the API key is valid.
   *
   * @example
   * ```typescript
   * const isValid = await submitter.validate();
   * if (!isValid) {
   *   console.error('Invalid API key');
   * }
   * ```
   */
  async validate(): Promise<boolean> {
    // Submit the homepage as a test
    const testUrl = `https://${this.config.host}/`
    const result = await this.submitUrls([testUrl])

    return result.success
  }
}
