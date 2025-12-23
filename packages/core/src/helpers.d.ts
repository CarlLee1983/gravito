import type { ContentfulStatusCode } from './http/types'
import type { PlanetCore } from './PlanetCore'
import type { Router } from './Router'
export { Arr } from './helpers/Arr'
export * from './helpers/data'
export * from './helpers/errors'
export * from './helpers/response'
export { Str } from './helpers/Str'
export declare class DumpDieError extends Error {
  readonly values: unknown[]
  name: string
  constructor(values: unknown[])
}
export type DumpOptions = {
  depth?: number | null
  colors?: boolean
}
export declare function dump(...values: unknown[]): void
export declare function dd(...values: unknown[]): never
export declare function tap<T>(value: T, callback: (value: T) => unknown): T
export declare function value<TArgs extends readonly unknown[], TResult>(
  value: (...args: TArgs) => TResult,
  ...args: TArgs
): TResult
export declare function value<TResult>(value: TResult): TResult
export declare function value<TArgs extends readonly unknown[], TResult>(
  valueOrFactory: TResult | ((...args: TArgs) => TResult),
  ...args: TArgs
): TResult
export declare function blank(value: unknown): boolean
export declare function filled(value: unknown): boolean
export declare function throwIf(condition: unknown, error?: Error | string | (() => Error)): void
export declare function throwUnless(
  condition: unknown,
  error?: Error | string | (() => Error)
): void
export declare function env<TDefault = string | undefined>(
  key: string,
  defaultValue?: TDefault
): string | TDefault
export declare function setApp(core: PlanetCore | null): void
export declare function hasApp(): boolean
export declare function app(): PlanetCore
export declare function config<T = unknown>(key: string): T
export declare function config<T>(key: string, defaultValue: T): T
export declare function logger(): import('gravito-core').Logger
export declare function router(): Router
export declare function abort(status: ContentfulStatusCode, message?: string): never
export declare function abortIf(
  condition: unknown,
  status: ContentfulStatusCode,
  message?: string
): void
export declare function abortUnless(
  condition: unknown,
  status: ContentfulStatusCode,
  message?: string
): void
//# sourceMappingURL=helpers.d.ts.map
