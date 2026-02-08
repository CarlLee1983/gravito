import type { Context } from '@gravito/core/compat'
import type { DataSource } from '../core/DataExtractor'
import { DataExtractor } from '../core/DataExtractor'
import type { FormRequestOptions } from '../FormRequest'
import type { ValidationResult } from './TypeUtils'

/**
 * Abstract base class for all FormRequest implementations.
 *
 * Provides a common framework for the validation lifecycle while allowing
 * subclasses to define library-specific schema validation logic.
 *
 * @typeParam TData - The type of data after successful validation.
 * @public
 */
export abstract class FormRequestBase<TData = unknown> {
  /**
   * The source of data to validate.
   * @defaultValue 'json'
   */
  source: DataSource = 'json'

  /**
   * Configuration overrides for this request.
   */
  options: FormRequestOptions = {}

  private dataExtractor = new DataExtractor()

  /**
   * Determines if the current request is authorized to proceed.
   *
   * @param ctx - The request context.
   * @returns True if authorized, false otherwise.
   */
  authorize?(ctx: Context): boolean | Promise<boolean>

  /**
   * Custom message for authorization failures.
   */
  authorizationMessage?(): string

  /**
   * Transforms the raw input data before it is passed to the validator.
   *
   * @param data - Raw data from the request source.
   * @returns The transformed data.
   */
  transform?(data: unknown): unknown

  /**
   * Defines custom error messages for specific fields or codes.
   */
  messages?(): Record<string, string>

  /**
   * Target URL to redirect to on validation failure (SSR only).
   */
  redirect?(): string

  /**
   * Extracts raw data from the request context.
   *
   * @param ctx - The request context.
   * @returns The raw data object.
   */
  public async getData(ctx: Context): Promise<unknown> {
    return this.dataExtractor.extract(ctx, this.source)
  }

  /**
   * Resolves a localized error message for a field.
   *
   * @param field - The field name.
   * @param code - The error code.
   * @param defaultMessage - Fallback message.
   * @returns The resolved message.
   * @internal
   */
  protected getErrorMessage(
    field: string,
    code: string | undefined,
    defaultMessage: string
  ): string {
    if (this.messages) {
      const customMessages = this.messages()
      const key = code ? `${field}.${code}` : field
      if (customMessages[key]) {
        return customMessages[key]
      }
      if (customMessages[field]) {
        return customMessages[field]
      }
    }

    if (this.options.messageProvider) {
      return this.options.messageProvider.getMessage(code ?? '', field, defaultMessage)
    }

    return defaultMessage
  }

  /**
   * Validates the request context against the defined schema.
   *
   * @param ctx - The request context.
   * @param options - Validation options.
   * @returns A result object containing either validated data or error details.
   */
  abstract validate(ctx: Context, options?: { partial?: boolean }): Promise<ValidationResult<TData>>

  /**
   * Generates a serializable blueprint of the validation rules.
   *
   * @returns A JSON-serializable object representing the schema.
   */
  abstract getBlueprint(): Record<string, any>
}
