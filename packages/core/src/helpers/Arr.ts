import { type DataPath, dataGet, dataHas, dataSet } from './data';

export const Arr = {
  get<TDefault = undefined>(
    target: unknown,
    path: DataPath | null | undefined,
    defaultValue?: TDefault
  ): unknown | TDefault {
    return dataGet(target, path, defaultValue);
  },

  has(target: unknown, path: DataPath | null | undefined): boolean {
    return dataHas(target, path);
  },

  set(target: unknown, path: DataPath, value: unknown, overwrite = true): unknown {
    return dataSet(target, path, value, overwrite);
  },

  wrap<T>(value: T | T[] | null | undefined): T[] {
    if (value === null || value === undefined) {
      return [];
    }
    return Array.isArray(value) ? value : [value];
  },

  first<T>(items: readonly T[], callback?: (value: T, index: number) => boolean): T | undefined {
    if (!callback) {
      return items[0];
    }
    for (let i = 0; i < items.length; i++) {
      const value = items[i] as T;
      if (callback(value, i)) {
        return value;
      }
    }
    return undefined;
  },

  last<T>(items: readonly T[], callback?: (value: T, index: number) => boolean): T | undefined {
    if (!callback) {
      return items.length ? items[items.length - 1] : undefined;
    }
    for (let i = items.length - 1; i >= 0; i--) {
      const value = items[i] as T;
      if (callback(value, i)) {
        return value;
      }
    }
    return undefined;
  },

  only<T extends Record<string, unknown>>(target: T, keys: readonly string[]): Partial<T> {
    const out: Partial<T> = {};
    for (const key of keys) {
      if (key in target) {
        out[key as keyof T] = target[key] as T[keyof T];
      }
    }
    return out;
  },

  except<T extends Record<string, unknown>>(target: T, keys: readonly string[]): Partial<T> {
    const out: Partial<T> = {};
    const excluded = new Set(keys);
    for (const [key, value] of Object.entries(target)) {
      if (!excluded.has(key)) {
        out[key as keyof T] = value as T[keyof T];
      }
    }
    return out;
  },

  flatten(items: unknown[], depth: number = Number.POSITIVE_INFINITY): unknown[] {
    const out: unknown[] = [];
    const walk = (value: unknown, currentDepth: number) => {
      if (Array.isArray(value) && currentDepth > 0) {
        for (const v of value) {
          walk(v, currentDepth - 1);
        }
        return;
      }
      out.push(value);
    };
    for (const item of items) {
      walk(item, depth);
    }
    return out;
  },

  pluck<TItem extends Record<string, unknown>>(
    items: readonly TItem[],
    valuePath: DataPath,
    keyPath?: DataPath
  ): unknown[] | Record<string, unknown> {
    if (!keyPath) {
      return items.map((item) => dataGet(item, valuePath));
    }

    const out: Record<string, unknown> = {};
    for (const item of items) {
      const key = dataGet(item, keyPath);
      out[String(key)] = dataGet(item, valuePath);
    }
    return out;
  },

  where<T>(items: readonly T[], callback: (value: T, index: number) => boolean): T[] {
    const out: T[] = [];
    for (let i = 0; i < items.length; i++) {
      const value = items[i] as T;
      if (callback(value, i)) {
        out.push(value);
      }
    }
    return out;
  },
} as const;
