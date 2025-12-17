import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export class DumpDieError extends Error {
  override name = 'DumpDieError';

  constructor(public readonly values: unknown[]) {
    super('Execution halted by dd()');
  }
}

export type DumpOptions = {
  depth?: number | null;
  colors?: boolean;
};

const defaultDumpOptions: Required<DumpOptions> = {
  depth: null,
  colors: true,
};

export function dump(...values: unknown[]): void {
  for (const value of values) {
    console.dir(value, {
      depth: defaultDumpOptions.depth,
      colors: defaultDumpOptions.colors,
    });
  }
}

export function dd(...values: unknown[]): never {
  dump(...values);
  throw new DumpDieError(values);
}

export function tap<T>(value: T, callback: (value: T) => unknown): T {
  callback(value);
  return value;
}

export function value<TArgs extends readonly unknown[], TResult>(
  value: (...args: TArgs) => TResult,
  ...args: TArgs
): TResult;
export function value<TResult>(value: TResult): TResult;
export function value<TArgs extends readonly unknown[], TResult>(
  valueOrFactory: TResult | ((...args: TArgs) => TResult),
  ...args: TArgs
): TResult;
export function value<TArgs extends readonly unknown[], TResult>(
  valueOrFactory: TResult | ((...args: TArgs) => TResult),
  ...args: TArgs
): TResult {
  if (typeof valueOrFactory === 'function') {
    return (valueOrFactory as (...a: TArgs) => TResult)(...args);
  }
  return valueOrFactory;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function blank(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === 'string') {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (value instanceof Map) {
    return value.size === 0;
  }
  if (value instanceof Set) {
    return value.size === 0;
  }
  if (isPlainObject(value)) {
    return Object.keys(value).length === 0;
  }

  return false;
}

export function filled(value: unknown): boolean {
  return !blank(value);
}

export type PathSegment = string | number;
export type DataPath = string | readonly PathSegment[];

function parsePath(path: DataPath | null | undefined): PathSegment[] {
  if (path === null || path === undefined) {
    return [];
  }
  if (typeof path !== 'string') {
    return [...path];
  }

  if (path === '') {
    return [];
  }

  return path.split('.').map((segment) => {
    const n = Number(segment);
    if (Number.isInteger(n) && String(n) === segment) {
      return n;
    }
    return segment;
  });
}

function getChild(current: unknown, key: PathSegment): unknown {
  if (current === null || current === undefined) {
    return undefined;
  }

  if (current instanceof Map) {
    return current.get(key);
  }

  if (typeof current === 'object' || typeof current === 'function') {
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic property access is required.
    return (current as any)[key as any];
  }

  return undefined;
}

function setChild(current: unknown, key: PathSegment, next: unknown): void {
  if (current === null || current === undefined) {
    throw new TypeError('dataSet target cannot be null or undefined.');
  }

  if (current instanceof Map) {
    current.set(key, next);
    return;
  }

  if (typeof current === 'object' || typeof current === 'function') {
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic property access is required.
    (current as any)[key as any] = next;
    return;
  }

  throw new TypeError('dataSet target must be object-like.');
}

export function dataGet<TDefault = undefined>(
  target: unknown,
  path: DataPath | null | undefined,
  defaultValue?: TDefault
): unknown | TDefault {
  const segments = parsePath(path);
  if (segments.length === 0) {
    return target;
  }

  let current: unknown = target;
  for (const segment of segments) {
    current = getChild(current, segment);
    if (current === undefined) {
      return defaultValue as TDefault;
    }
  }

  return current;
}

export function dataSet(
  target: unknown,
  path: DataPath,
  setValue: unknown,
  overwrite = true
): unknown {
  const segments = parsePath(path);
  if (segments.length === 0) {
    return target;
  }

  let current: unknown = target;
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i] as PathSegment;
    const nextSegment = segments[i + 1] as PathSegment;

    const existing = getChild(current, segment);
    if (
      existing !== undefined &&
      (typeof existing === 'object' || typeof existing === 'function')
    ) {
      current = existing;
      continue;
    }

    const created = typeof nextSegment === 'number' ? [] : {};
    setChild(current, segment, created);
    current = created;
  }

  const last = segments[segments.length - 1] as PathSegment;
  const existingLast = getChild(current, last);
  if (overwrite || existingLast === undefined) {
    setChild(current, last, setValue);
  }

  return target;
}

function toError(error: Error | string | (() => Error)): Error {
  if (typeof error === 'string') {
    return new Error(error);
  }
  if (typeof error === 'function') {
    return error();
  }
  return error;
}

export function throwIf(
  condition: unknown,
  error: Error | string | (() => Error) = 'Error.'
): void {
  if (condition) {
    throw toError(error);
  }
}

export function throwUnless(
  condition: unknown,
  error: Error | string | (() => Error) = 'Error.'
): void {
  if (!condition) {
    throw toError(error);
  }
}

type EnvShape = {
  Bun?: {
    env?: Record<string, string | undefined>;
  };
};

export function env<TDefault = string | undefined>(key: string, defaultValue?: TDefault) {
  const bunEnv = (globalThis as EnvShape).Bun?.env;
  const value = bunEnv?.[key] ?? process.env[key];
  return (value ?? defaultValue) as string | TDefault;
}

export function abort(status: ContentfulStatusCode, message?: string): never {
  if (message === undefined) {
    throw new HTTPException(status);
  }
  throw new HTTPException(status, { message });
}

export function abortIf(condition: unknown, status: ContentfulStatusCode, message?: string): void {
  if (condition) {
    abort(status, message);
  }
}

export function abortUnless(
  condition: unknown,
  status: ContentfulStatusCode,
  message?: string
): void {
  if (!condition) {
    abort(status, message);
  }
}
