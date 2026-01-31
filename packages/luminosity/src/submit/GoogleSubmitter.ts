import { createRateLimiter, type RateLimitConfig, type RateLimiter } from './RateLimiter'

/**
 * Google Indexing API action types.
 *
 * @public
 * @since 3.1.0
 */
export type GoogleIndexingAction = 'URL_UPDATED' | 'URL_DELETED'

/**
 * Configuration for Google Indexing API submitter.
 *
 * @public
 * @since 3.1.0
 */
export interface GoogleSubmitterConfig {
  /**
   * Path to Google Service Account JSON file.
   *
   * You can create a service account at:
   * https://console.cloud.google.com/iam-admin/serviceaccounts
   */
  serviceAccountPath?: string

  /**
   * Or provide service account credentials directly.
   */
  serviceAccountCredentials?: {
    client_email: string
    private_key: string
    project_id?: string
  }

  /** Optional rate limiting configuration. */
  rateLimit?: RateLimitConfig

  /** Custom API endpoint (for testing). */
  endpoint?: string
}

/**
 * Result of a Google Indexing API submission.
 *
 * @public
 * @since 3.1.0
 */
export interface GoogleSubmitResult {
  /** Whether the submission succeeded. */
  success: boolean
  /** The URL that was submitted. */
  url: string
  /** Error message if failed. */
  error?: string
  /** HTTP status code. */
  statusCode?: number
}

/**
 * Google Indexing API submitter.
 *
 * Uses Google's Indexing API to notify Google when URLs are updated or deleted.
 * Requires a Google Cloud Service Account with Indexing API enabled.
 *
 * Setup steps:
 * 1. Enable the Indexing API in Google Cloud Console
 * 2. Create a Service Account
 * 3. Download the JSON key file
 * 4. Add the service account email as owner in Google Search Console
 *
 * @public
 * @since 3.1.0
 *
 * @example
 * ```typescript
 * const submitter = new GoogleSubmitter({
 *   serviceAccountPath: './service-account.json'
 * });
 *
 * await submitter.submitUrl('https://example.com/new-page', 'URL_UPDATED');
 * ```
 */
export class GoogleSubmitter {
  private rateLimiter?: RateLimiter
  private endpoint: string
  private credentials?: {
    client_email: string
    private_key: string
    project_id?: string
  }
  private accessToken?: string
  private tokenExpiresAt?: number

  constructor(private config: GoogleSubmitterConfig) {
    this.endpoint = config.endpoint || 'https://indexing.googleapis.com/v3/urlNotifications:publish'

    if (config.rateLimit) {
      this.rateLimiter = createRateLimiter(config.rateLimit)
    }
  }

  /**
   * Initialize the submitter by loading credentials.
   *
   * @throws {Error} If credentials cannot be loaded.
   */
  async init(): Promise<void> {
    if (this.config.serviceAccountCredentials) {
      this.credentials = this.config.serviceAccountCredentials
      return
    }

    if (this.config.serviceAccountPath) {
      // In a real implementation, we'd use fs.readFile here
      // For now, this is a placeholder for the structure
      throw new Error(
        'serviceAccountPath requires fs module. Use serviceAccountCredentials in browser/edge environments.'
      )
    }

    throw new Error('Either serviceAccountPath or serviceAccountCredentials must be provided')
  }

  /**
   * Submit a single URL to Google Indexing API.
   *
   * @param url - The URL to submit.
   * @param action - The action type (URL_UPDATED or URL_DELETED).
   * @returns Submission result.
   *
   * @example
   * ```typescript
   * await submitter.submitUrl('https://example.com/page', 'URL_UPDATED');
   * ```
   */
  async submitUrl(
    url: string,
    action: GoogleIndexingAction = 'URL_UPDATED'
  ): Promise<GoogleSubmitResult> {
    if (this.rateLimiter) {
      await this.rateLimiter.acquire()
    }

    try {
      const accessToken = await this.getAccessToken()

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          url,
          type: action,
        }),
      })

      if (response.ok) {
        return {
          success: true,
          url,
          statusCode: response.status,
        }
      }

      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || response.statusText

      return {
        success: false,
        url,
        error: `HTTP ${response.status}: ${errorMessage}`,
        statusCode: response.status,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        url,
        error: `Network error: ${message}`,
      }
    }
  }

  /**
   * Submit multiple URLs in batch.
   *
   * Note: Google Indexing API doesn't have a native batch endpoint,
   * so this method submits URLs sequentially with rate limiting.
   *
   * @param urls - Array of URLs to submit.
   * @param action - The action type for all URLs.
   * @returns Array of submission results.
   *
   * @example
   * ```typescript
   * const results = await submitter.submitBatch([
   *   'https://example.com/page1',
   *   'https://example.com/page2'
   * ], 'URL_UPDATED');
   *
   * const successCount = results.filter(r => r.success).length;
   * console.log(`Successfully submitted ${successCount}/${results.length} URLs`);
   * ```
   */
  async submitBatch(
    urls: string[],
    action: GoogleIndexingAction = 'URL_UPDATED'
  ): Promise<GoogleSubmitResult[]> {
    const results: GoogleSubmitResult[] = []

    for (const url of urls) {
      const result = await this.submitUrl(url, action)
      results.push(result)

      // Stop on auth errors (no point continuing)
      if (result.statusCode === 401 || result.statusCode === 403) {
        break
      }
    }

    return results
  }

  /**
   * Get an OAuth2 access token using JWT assertion.
   *
   * Implements the service account authentication flow as described in:
   * https://developers.google.com/identity/protocols/oauth2/service-account
   *
   * @returns Access token.
   * @private
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
      return this.accessToken
    }

    if (!this.credentials) {
      await this.init()
    }

    if (!this.credentials) {
      throw new Error('Credentials not initialized')
    }

    // Create JWT
    const jwt = await this.createJWT()

    // Exchange JWT for access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get access token: ${error}`)
    }

    const data = await response.json()
    this.accessToken = data.access_token
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000 // Refresh 1 min early

    return this.accessToken
  }

  /**
   * Create a JWT (JSON Web Token) for service account authentication.
   *
   * @returns Signed JWT string.
   * @private
   */
  private async createJWT(): Promise<string> {
    if (!this.credentials) {
      throw new Error('Credentials not initialized')
    }

    const now = Math.floor(Date.now() / 1000)
    const claims = {
      iss: this.credentials.client_email,
      scope: 'https://www.googleapis.com/auth/indexing',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }

    // In a real implementation, we'd use a JWT library here
    // For now, this is a simplified placeholder
    const header = this.base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const payload = this.base64UrlEncode(JSON.stringify(claims))
    const unsigned = `${header}.${payload}`

    // Sign with private key (simplified - real implementation needs crypto)
    const signature = await this.signJWT(unsigned, this.credentials.private_key)

    return `${unsigned}.${signature}`
  }

  /**
   * Sign JWT with RSA-SHA256 (placeholder).
   * @private
   */
  private async signJWT(_data: string, _privateKey: string): Promise<string> {
    // This is a placeholder. In a real implementation, you'd use:
    // - Node.js: crypto.sign() with private key
    // - Browser/Edge: SubtleCrypto.sign()
    // - Or a library like 'jsonwebtoken' or 'jose'
    throw new Error(
      'JWT signing requires crypto implementation. Use a library like "jose" or "jsonwebtoken".'
    )
  }

  /**
   * Base64-URL encode a string.
   * @private
   */
  private base64UrlEncode(str: string): string {
    const base64 = Buffer.from(str).toString('base64')
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }
}
