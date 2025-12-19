import { type DataPath } from './data'
export declare const Arr: {
  readonly get: <TDefault = undefined>(
    target: unknown,
    path: DataPath | null | undefined,
    defaultValue?: TDefault
  ) => unknown | TDefault
  readonly has: (target: unknown, path: DataPath | null | undefined) => boolean
  readonly set: (target: unknown, path: DataPath, value: unknown, overwrite?: boolean) => unknown
  readonly wrap: <T>(value: T | T[] | null | undefined) => T[]
  readonly first: <T>(
    items: readonly T[],
    callback?: (value: T, index: number) => boolean
  ) => T | undefined
  readonly last: <T>(
    items: readonly T[],
    callback?: (value: T, index: number) => boolean
  ) => T | undefined
  readonly only: <T extends Record<string, unknown>>(
    target: T,
    keys: readonly string[]
  ) => Partial<T>
  readonly except: <T extends Record<string, unknown>>(
    target: T,
    keys: readonly string[]
  ) => Partial<T>
  readonly flatten: (items: unknown[], depth?: number) => unknown[]
  readonly pluck: <TItem extends Record<string, unknown>>(
    items: readonly TItem[],
    valuePath: DataPath,
    keyPath?: DataPath
  ) => unknown[] | Record<string, unknown>
  readonly where: <T>(items: readonly T[], callback: (value: T, index: number) => boolean) => T[]
}
//# sourceMappingURL=Arr.d.ts.map
