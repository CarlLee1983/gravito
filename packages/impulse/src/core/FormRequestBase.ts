import type { Context } from '@gravito/core/compat'
import { BlueprintGenerator } from '../core/BlueprintGenerator'
import type { DataSource } from '../core/DataExtractor'
import { DataExtractor } from '../core/DataExtractor'
import type { DefaultMessageProvider, FormRequestOptions, MessageProvider } from '../FormRequest'
import type { ValidationResult } from './TypeUtils'

/**
 * Base class for all FormRequest implementations with generic type support.
 *
 * Provides common functionality while allowing specific implementations
 * to define their own schema validation logic.
 *
 * @public
 * @since 3.1.0
 */
export abstract class FormRequestBase<TData = unknown> {
  /** Data source: 'json' | 'form' | 'query' | 'param' */
  source: DataSource = 'json'

  /** Configuration options */
  options: FormRequestOptions = {}

  /** Data extractor instance for getting raw data from context */
  private dataExtractor = new DataExtractor()

  /**
   * Authorization check (optional).
   * Return false to reject the request with 403.
   */
  authorize?(ctx: Context): boolean | Promise<boolean>

  /**
   * Custom authorization error message (optional).
   * Override for custom messages.
   */
  authorizationMessage?(): string

  /**
   * Transform data before validation (optional).
   * Useful for coercing types or adding defaults.
   */
  transform?(data: unknown): unknown

  /**
   * Custom error messages (optional).
   * Map field.code to custom message.
   */
  messages?(): Record<string, string>

  /**
   * Custom redirect URL for HTML validation failures (optional).
   */
  redirect?(): string

  /**
   * Get raw data from context based on source.
   *
   * @param ctx - The request context.
   * @returns A promise that resolves to the raw data object.
   */
  public async getData(ctx: Context): Promise<unknown> {
    return this.dataExtractor.extract(ctx, this.source)
  }

  /**
   * Get localized/custom message for a validation error.
   *
   * @param field - The field name.
   * @param code - The error code.
   * @param defaultMessage - The default error message.
   * @returns The resolved error message.
   */
  protected getErrorMessage(
    field: string,
    code: string | undefined,
    defaultMessage: string
  ): string {
    // 1. Check custom messages from messages() method
    if (this.messages) {
      const customMessages = this.messages()
      const key = code ? `${field}.${code}` : field
      if (customMessages[key]) {
        return customMessages[key]
      }
      // Try field-only key
      if (customMessages[field]) {
        return customMessages[field]
      }
    }

    // 2. Check i18n message provider
    if (this.options.messageProvider) {
      return this.options.messageProvider.getMessage(code ?? '', field, defaultMessage)
    }

    // 3. Return default
    return defaultMessage
  }

  /**
   * Abstract method for schema validation.
   * Must be implemented by concrete classes.
   *
   * @param ctx - The request context.
   * @returns A promise resolving to a typed validation result.
   */
  abstract validate(ctx: Context): Promise<ValidationResult<TData>>

  /**
   * Extract validation metadata for frontend consumption (Blueprint).
   * This allows the frontend to replicate validation logic without code duplication.
   */
  abstract getBlueprint(): Record<string, any>
}
