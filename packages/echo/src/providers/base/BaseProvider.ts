/**
 * Abstract base class for webhook providers.
 * @module @gravito/echo/providers/base
 */

import type { WebhookProvider, WebhookVerificationResult } from '../../types'
import { getHeader, hasHeader } from './HeaderUtils'

/**
 * Configuration options for webhook providers.
 */
export interface ProviderOptions {
  /**
   * Maximum allowed age of the webhook request in seconds to prevent replay attacks.
   * @defaultValue 300
   */
  tolerance?: number
}

/**
 * Base implementation for all webhook providers.
 * Handles common header extraction, payload conversion, and result formatting.
 *
 * @example
 * ```typescript
 * class MyProvider extends BaseProvider {
 *   readonly name = 'my-provider';
 *   async verify(payload, headers, secret) {
 *     // Implementation logic
 *     return this.createSuccess(JSON.parse(payload));
 *   }
 * }
 * ```
 */
export abstract class BaseProvider implements WebhookProvider {
  /** Unique identifier for the provider. */
  abstract readonly name: string

  /** Time tolerance for timestamp validation. */
  protected tolerance: number

  constructor(options: ProviderOptions = {}) {
    this.tolerance = options.tolerance ?? 300
  }

  /**
   * Verifies the authenticity of a webhook request.
   *
   * @param payload - Raw request body.
   * @param headers - Request headers.
   * @param secret - Provider-specific secret key.
   * @returns Verification result containing the parsed payload or error message.
   * @throws Error if verification logic encounters an unrecoverable failure.
   */
  abstract verify(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): Promise<WebhookVerificationResult>

  /**
   * Extracts the event type from the verified payload.
   *
   * @param payload - The parsed webhook payload.
   * @returns The event type string if found.
   */
  parseEventType?(payload: unknown): string | undefined

  // ─────────────────────────────────────────────
  // Protected Helpers
  // ─────────────────────────────────────────────

  /**
   * Retrieves a header value in a case-insensitive manner.
   */
  protected getHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string
  ): string | undefined {
    return getHeader(headers, name)
  }

  /**
   * Checks if a specific header exists.
   */
  protected hasHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string
  ): boolean {
    return hasHeader(headers, name)
  }

  /**
   * Creates a failed verification result.
   */
  protected createFailure(error: string): WebhookVerificationResult {
    return { valid: false, error }
  }

  /**
   * Creates a successful verification result.
   */
  protected createSuccess(
    payload: unknown,
    options: { eventType?: string; webhookId?: string } = {}
  ): WebhookVerificationResult {
    return {
      valid: true,
      payload,
      eventType: options.eventType,
      webhookId: options.webhookId,
    }
  }

  /**
   * Ensures the payload is a string.
   */
  protected payloadToString(payload: string | Buffer): string {
    return typeof payload === 'string' ? payload : payload.toString('utf-8')
  }

  /**
   * Safely parses a JSON string without throwing.
   */
  protected safeParseJson(
    str: string
  ): { success: true; data: unknown } | { success: false; error: string } {
    try {
      return { success: true, data: JSON.parse(str) }
    } catch {
      return { success: false, error: 'Failed to parse webhook payload' }
    }
  }
}
