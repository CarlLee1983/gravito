import type { Context } from '@gravito/core/compat'
import { BlueprintGenerator } from '../core/BlueprintGenerator'
import type { DataSource } from '../core/DataExtractor'
import { DataExtractor } from '../core/DataExtractor'
import type { DefaultMessageProvider, FormRequestOptions, MessageProvider } from '../FormRequest'
import type { ValidationResult } from './TypeUtils'

/**
 * Abstract base class for all FormRequest implementations
 *
 * Provides a common framework for the validation process while allowing subclasses (e.g., ZodFormRequest, ValibotFormRequest)
 * to define their own schema validation logic. This design pattern ensures a consistent API across different validation libraries.
 *
 * Main Responsibilities:
 * - Data Extraction: Unified extraction of data from various sources (JSON, form, query parameters, etc.).
 * - Message Resolution: Handling custom error messages and internationalization.
 * - Shared Logic: Providing reusable functions such as authorization and transformation.
 *
 * This class should not be used directly; instead, use `ZodFormRequest` or `ValibotFormRequest`.
 *
 * @typeParam TData - The type of data after successful validation, typically inferred from the schema.
 *
 * @public
 * @since 3.1.0
 *
 * @example
 * ```typescript
 * // Do not use FormRequestBase directly
 * // Incorrect: class MyRequest extends FormRequestBase { ... }
 * // Correct: class MyRequest extends ZodFormRequest { ... }
 * // Correct: class MyRequest extends ValibotFormRequest { ... }
 * ```
 */
export abstract class FormRequestBase<TData = unknown> {
  /** Data Source: Determines from which part of the request to extract data for validation */
  source: DataSource = 'json'

  /** Configuration options: Custom HTTP status codes and message providers */
  options: FormRequestOptions = {}

  /** Data extractor instance: Responsible for extracting raw data from the context */
  private dataExtractor = new DataExtractor()

  /**
   * Authorization check hook (optional)
   *
   * Executed before data validation; used to check if the current user has permission to perform this operation.
   * Returning false will abort the validation and throw a 403 Authorization Error.
   *
   * @param ctx - The request context, from which user information can be obtained
   * @returns Whether to allow validation to proceed
   */
  authorize?(ctx: Context): boolean | Promise<boolean>

  /**
   * Custom authorization error message (optional)
   *
   * Provides a more specific error message to the user when an authorization check fails.
   *
   * @returns The error message for authorization failure
   */
  authorizationMessage?(): string

  /**
   * Data transformation hook (optional)
   *
   * Pre-processes the raw data before schema validation.
   * Commonly used for type coercion, adding default values, or formatting input data.
   *
   * @param data - Raw data extracted from the request
   * @returns Transformed data
   */
  transform?(data: unknown): unknown

  /**
   * Custom error message mapping (optional)
   *
   * Defines field-level error messages to override the validator's default messages.
   * Key format: `field_name.error_code` or simply `field_name`.
   *
   * @returns An object mapping fields to error messages
   */
  messages?(): Record<string, string>

  /**
   * Redirect URL upon validation failure (optional)
   *
   * Used for server-side rendered applications; specifies the page to redirect to when validation fails.
   *
   * @returns The target URL for redirection
   */
  redirect?(): string

  /**
   * Extract raw data from the request context
   *
   * Extracts data from the corresponding part of the request based on the `source` attribute configuration.
   * This method handles the complexities of different data sources (JSON, form data, query parameters, route parameters).
   *
   * @param ctx - Gravito request context object
   * @returns Raw data object (unvalidated)
   */
  public async getData(ctx: Context): Promise<unknown> {
    return this.dataExtractor.extract(ctx, this.source)
  }

  /**
   * Resolve the final validation error message
   *
   * Look up an appropriate error message in the following order of priority:
   * 1. Custom messages (from the `messages()` method)
   * 2. Internationalized messages (from the `messageProvider`)
   * 3. Default message (original message from the validator)
   *
   * This method is protected as it is a helper method for internal use.
   *
   * @param field - Field name
   * @param code - Error code (optional)
   * @param defaultMessage - Default error message
   * @returns The resolved final error message
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
   * Abstract method to perform schema validation
   *
   * This method must be implemented by concrete subclasses (e.g., ZodFormRequest, ValibotFormRequest).
   * Each subclass will implement validation logic according to the validation library it uses.
   *
   * @param ctx - Request context object
   * @returns Type-safe validation result containing validated data or error information
   */
  abstract validate(ctx: Context): Promise<ValidationResult<TData>>

  /**
   * Abstract method to extract validation schema metadata
   *
   * This method must be implemented by subclasses to convert the schema into a serializable JSON format.
   * The frontend can use this metadata to implement the same validation rules, avoiding duplicate definitions.
   *
   * @returns A structured metadata object of the Schema
   */
  abstract getBlueprint(): Record<string, any>
}
