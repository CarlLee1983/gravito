import { FormatRegistry } from '@sinclair/typebox'

/**
 * Pre-registered Format Names.
 *
 * Provides common data format validators including email, url, uuid, date-time, etc.
 */
export const REGISTERED_FORMATS = [
  'email',
  'uri',
  'uri-reference',
  'uuid',
  'date-time',
  'date',
  'time',
  'ipv4',
  'ipv6',
] as const

export type RegisteredFormat = (typeof REGISTERED_FORMATS)[number]

/**
 * Email Format Validation Regex.
 *
 * Compliant with RFC 5322 basic email format.
 */
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

/**
 * UUID Format Validation Regex.
 *
 * Supports UUID v1-v5 formats.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * URL Format Validation Regex.
 *
 * Basic URL format validation.
 */
const URL_REGEX =
  /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/

/**
 * URI Reference Format Validation Regex.
 *
 * Supports relative and absolute URIs.
 */
const URI_REFERENCE_REGEX = /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/\/)?[^\s]*$/i

/**
 * ISO 8601 Date-Time Format Validation Regex.
 *
 * Format: YYYY-MM-DDTHH:mm:ss.sssZ
 */
const DATE_TIME_REGEX =
  /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?$/

/**
 * ISO 8601 Date Format Validation Regex.
 *
 * Format: YYYY-MM-DD (includes value range validation)
 */
const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

/**
 * ISO 8601 Time Format Validation Regex.
 *
 * Format: HH:mm:ss or HH:mm:ss.sss (includes value range validation)
 */
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.\d{3})?$/

/**
 * IPv4 Format Validation Regex.
 */
const IPV4_REGEX =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/

/**
 * IPv6 Format Validation Regex.
 */
const IPV6_REGEX =
  /^(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?:(?::[0-9a-fA-F]{1,4}){1,6})|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:))$/

/**
 * Format Validator Mapping.
 *
 * Maps format names to corresponding validation functions.
 */
const FORMAT_VALIDATORS: Record<string, (value: string) => boolean> = {
  email: (value: string) => EMAIL_REGEX.test(value),
  uri: (value: string) => URL_REGEX.test(value),
  'uri-reference': (value: string) => URI_REFERENCE_REGEX.test(value),
  uuid: (value: string) => UUID_REGEX.test(value),
  'date-time': (value: string) => DATE_TIME_REGEX.test(value),
  date: (value: string) => DATE_REGEX.test(value),
  time: (value: string) => TIME_REGEX.test(value),
  ipv4: (value: string) => IPV4_REGEX.test(value),
  ipv6: (value: string) => IPV6_REGEX.test(value),
}

/**
 * Registers Custom Format Validator.
 *
 * Allows registering custom format validation logic to TypeBox's FormatRegistry.
 * Once registered, can be used in Schema.String() via the format option.
 *
 * @param name - Format name (e.g., 'phone-number', 'credit-card')
 * @param validator - Validation function, returns true if valid
 *
 * @example Register Taiwan Phone Number Format
 * ```typescript
 * registerFormat('tw-phone', (value) => /^09\d{8}$/.test(value))
 *
 * const schema = Schema.String({ format: 'tw-phone' })
 * const valid = Value.Check(schema, '0912345678') // true
 * ```
 *
 * @example Register Credit Card Format (Simplified)
 * ```typescript
 * registerFormat('credit-card', (value) => {
 *   const cleaned = value.replace(/\s/g, '')
 *   return /^\d{13,19}$/.test(cleaned)
 * })
 * ```
 */
export function registerFormat(name: string, validator: (value: string) => boolean): void {
  FormatRegistry.Set(name, validator)
}

/**
 * Registers All Predefined Format Validators.
 *
 * Registers all common formats (email, url, uuid, etc.) to TypeBox's FormatRegistry.
 * Typically called once at application startup.
 *
 * @example Register at Application Entry Point
 * ```typescript
 * import { registerAllFormats } from '@gravito/mass'
 *
 * // Register all predefined formats
 * registerAllFormats()
 *
 * // Now you can use these formats in schemas
 * const userSchema = Schema.Object({
 *   email: Schema.String({ format: 'email' }),
 *   website: Schema.String({ format: 'uri' }),
 *   id: Schema.String({ format: 'uuid' })
 * })
 * ```
 */
export function registerAllFormats(): void {
  for (const [name, validator] of Object.entries(FORMAT_VALIDATORS)) {
    FormatRegistry.Set(name, validator)
  }
}

/**
 * Checks if a Specific Format is Registered.
 *
 * @param name - Format name
 * @returns True if the format is registered
 *
 * @example
 * ```typescript
 * registerFormat('custom-format', (value) => true)
 * isFormatRegistered('custom-format') // true
 * isFormatRegistered('unknown-format') // false
 * ```
 */
export function isFormatRegistered(name: string): boolean {
  return FormatRegistry.Has(name)
}

/**
 * Gets Registered Format Validator.
 *
 * @param name - Format name
 * @returns Validation function, or undefined if not registered
 *
 * @example
 * ```typescript
 * const emailValidator = getFormatValidator('email')
 * if (emailValidator) {
 *   const isValid = emailValidator('test@example.com') // true
 * }
 * ```
 */
export function getFormatValidator(name: string): ((value: string) => boolean) | undefined {
  return FormatRegistry.Has(name) ? FormatRegistry.Get(name) : undefined
}

/**
 * Removes Registered Format Validator.
 *
 * @param name - Format name
 *
 * @example
 * ```typescript
 * registerFormat('temp-format', (value) => true)
 * unregisterFormat('temp-format')
 * isFormatRegistered('temp-format') // false
 * ```
 */
export function unregisterFormat(name: string): void {
  FormatRegistry.Delete(name)
}
