import type { ContentfulStatusCode } from './http/types'
import type { PlanetCore } from './PlanetCore'
import type { Router } from './Router'
export { Arr } from './helpers/Arr'
export * from './helpers/data'
export * from './helpers/errors'
export * from './helpers/response'
export { Str } from './helpers/Str'
/**
 * Error subclass used for dump and die functionality.
 * @internal
 */
export declare class DumpDieError extends Error {
  readonly values: unknown[]
  name: string
  constructor(values: unknown[])
}
/**
 * Options for dump output
 * @public
 */
export type DumpOptions = {
  depth?: number | null
  colors?: boolean
}
/**
 * Dump data to console for debugging.
 *
 * Uses `console.dir` with configurable depth and colors to provide a
 * readable representation of any value.
 *
 * @param values - One or more values to dump to the console.
 *
 * @example
 * ```typescript
 * dump(user, { meta: 'data' });
 * ```
 *
 * @public
 * @since 3.0.0
 */
export declare function dump(...values: unknown[]): void
/**
 * Dump data to console and exit process (or throw in HTTP context).
 *
 * Short for "Dump and Die". In a CLI environment, it exits the process.
 * In an HTTP context (like a web request), it throws a `DumpDieError`
 * which is caught by the exception handler to display the debug output.
 *
 * @param values - One or more values to dump and then die.
 * @throws {DumpDieError} Always throws this error to halt execution.
 *
 * @example
 * ```typescript
 * dd(user.permissions);
 * ```
 *
 * @public
 * @since 3.0.0
 */
export declare function dd(...values: unknown[]): never
/**
 * Tap into a value, execute a callback, and return the value.
 *
 * This allows you to perform "side effects" on a value without breaking
 * the chain of operations.
 *
 * @param value - The value to tap into.
 * @param callback - A callback that receives the value.
 * @returns The original value.
 *
 * @example
 * ```typescript
 * const user = tap(new User(), (u) => {
 *   u.name = 'Alice';
 *   u.save();
 * });
 * ```
 *
 * @public
 * @since 3.0.0
 */
export declare function tap<T>(value: T, callback: (value: T) => unknown): T
/**
 * Return the default value of the given value.
 *
 * If the value is a function, it will be executed with the provided arguments
 * and its result will be returned. Otherwise, the value itself is returned.
 * This is useful for handling optional lazy-loaded values.
 *
 * @param valueOrFactory - The value or a factory function.
 * @param args - Arguments to pass to the factory function if it is a function.
 * @returns The resolved value.
 *
 * @example
 * ```typescript
 * value(10); // 10
 * value(() => 10); // 10
 * value((name) => `Hello ${name}`, 'World'); // "Hello World"
 * ```
 *
 * @public
 * @since 3.0.0
 */
export declare function value<TArgs extends readonly unknown[], TResult>(
  valueOrFactory: TResult | ((...args: TArgs) => TResult),
  ...args: TArgs
): TResult
/**
 * Determine if the given value is "blank".
 *
 * A value is considered blank if it is:
 * - `null` or `undefined`
 * - An empty string or a string containing only whitespace
 * - An empty array
 * - An empty object
 * - An empty Map or Set
 *
 * @param value - The value to check.
 * @returns `true` if the value is blank, `false` otherwise.
 *
 * @example
 * ```typescript
 * blank(''); // true
 * blank('  '); // true
 * blank([]); // true
 * blank({}); // true
 * blank(0); // false
 * ```
 *
 * @public
 * @since 3.0.0
 */
export declare function blank(value: unknown): boolean
/**
 * Determine if the given value is "filled" (not blank).
 *
 * This is the inverse of `blank()`.
 *
 * @param value - The value to check.
 * @returns `true` if the value is not blank, `false` otherwise.
 *
 * @example
 * ```typescript
 * filled('hello'); // true
 * filled([1, 2, 3]); // true
 * filled(''); // false
 * ```
 *
 * @public
 * @since 3.0.0
 */
export declare function filled(value: unknown): boolean
/**
 * Throw an exception if the given condition is true.
 *
 * @param condition - The condition to evaluate.
 * @param error - The exception to throw, a factory function, or an error message string.
 * @throws {Error} If the condition evaluates to true.
 *
 * @example
 * ```typescript
 * throwIf(user.isBanned, 'User is banned from the system');
 * throwIf(count > 100, () => new ValidationError('Too many items'));
 * ```
 *
 * @public
 * @since 3.0.0
 */
export declare function throwIf(condition: unknown, error?: Error | string | (() => Error)): void
/**
 * Throw an exception unless the given condition is true.
 *
 * @param condition - The condition to evaluate.
 * @param error - The exception to throw, a factory function, or an error message string.
 * @throws {Error} If the condition evaluates to false.
 *
 * @example
 * ```typescript
 * throwUnless(user.isAdmin, 'Unauthorized access');
 * ```
 *
 * @public
 * @since 3.0.0
 */
export declare function throwUnless(
  condition: unknown,
  error?: Error | string | (() => Error)
): void
/**
 * Get the value of an environment variable.
 *
 * Automatically detects the runtime environment (Bun or Node.js) to retrieve
 * the variable.
 *
 * @param key - The environment variable name.
 * @param defaultValue - An optional default value to return if the variable is not defined.
 * @returns The environment variable value or the default value.
 *
 * @example
 * ```typescript
 * const debug = env('DEBUG', 'false');
 * const apiKey = env('API_KEY');
 * ```
 *
 * @public
 * @since 3.0.0
 */
export declare function env<TDefault = string | undefined>(
  key: string,
  defaultValue?: TDefault
): string | TDefault
/**
 * Set the global application instance.
 *
 * This is used internally during the bootstrap process to provide global
 * access to the application instance via the `app()` helper.
 *
 * @param core - The PlanetCore instance to set as global.
 * @internal
 */
export declare function setApp(core: PlanetCore | null): void
/**
 * Check if the global application instance has been initialized and set.
 *
 * @returns `true` if the application instance is set, `false` otherwise.
 *
 * @public
 * @since 3.0.0
 */
export declare function hasApp(): boolean
/**
 * Get the global application instance.
 *
 * Provides access to the core application container, configuration, and services.
 *
 * @returns The initialized PlanetCore instance.
 * @throws {Error} If the application has not been initialized.
 *
 * @example
 * ```typescript
 * const core = app();
 * console.log(core.version);
 * ```
 *
 * @public
 * @since 3.0.0
 */
export declare function app(): PlanetCore
/**
 * Get a configuration value from the application.
 *
 * Supports dot notation for accessing nested configuration properties.
 *
 * @param key - The configuration key in dot notation (e.g., 'app.name').
 * @param defaultValue - An optional default value to return if the key is not found.
 * @returns The configuration value or the default value.
 *
 * @example
 * ```typescript
 * const appName = config('app.name');
 * const port = config('app.port', 3000);
 * ```
 *
 * @public
 * @since 3.0.0
 */
export declare function config<T = unknown>(key: string, defaultValue?: T): T
/**
 * Get the global logger instance.
 *
 * Shortcut for `app().logger`.
 *
 * @returns The application's logger instance.
 *
 * @example
 * ```typescript
 * logger().info('Operation completed successfully');
 * ```
 *
 * @public
 * @since 3.0.0
 */
export declare function logger(): import('./Logger').Logger
/**
 * Get the application's primary router instance.
 *
 * Shortcut for `app().router`.
 *
 * @returns The router instance.
 *
 * @public
 * @since 3.0.0
 */
export declare function router(): Router
/**
 * Abort the current request with an HTTP exception.
 *
 * Throws an `HttpException` with the specified status code and optional message.
 *
 * @param status - The HTTP status code to return.
 * @param message - An optional custom error message.
 * @throws {HttpException} Always throws this exception.
 *
 * @example
 * ```typescript
 * abort(403, 'You do not have permission to access this resource');
 * ```
 *
 * @public
 * @since 3.0.0
 */
export declare function abort(status: ContentfulStatusCode, message?: string): never
/**
 * Abort the request if the given condition is true.
 *
 * @param condition - The condition to evaluate.
 * @param status - The HTTP status code to return.
 * @param message - An optional custom error message.
 * @throws {HttpException} If the condition is true.
 *
 * @example
 * ```typescript
 * abortIf(!user.isActive, 403, 'Account is deactivated');
 * ```
 *
 * @public
 * @since 3.0.0
 */
export declare function abortIf(
  condition: unknown,
  status: ContentfulStatusCode,
  message?: string
): void
/**
 * Abort the request unless the given condition is true.
 *
 * @param condition - The condition to evaluate.
 * @param status - The HTTP status code to return.
 * @param message - An optional custom error message.
 * @throws {HttpException} If the condition is false.
 *
 * @example
 * ```typescript
 * abortUnless(request.hasValidToken(), 401, 'Invalid authentication token');
 * ```
 *
 * @public
 * @since 3.0.0
 */
export declare function abortUnless(
  condition: unknown,
  status: ContentfulStatusCode,
  message?: string
): void
