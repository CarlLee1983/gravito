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

function hasChild(current: unknown, key: PathSegment): boolean {
  if (current === null || current === undefined) {
    return false;
  }

  if (current instanceof Map) {
    return current.has(key);
  }

  if (typeof current === 'object' || typeof current === 'function') {
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic property access is required.
    return key in (current as any);
  }

  return false;
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

export function dataHas(target: unknown, path: DataPath | null | undefined): boolean {
  const segments = parsePath(path);
  if (segments.length === 0) {
    return true;
  }

  let current: unknown = target;
  for (const segment of segments) {
    if (!hasChild(current, segment)) {
      return false;
    }
    current = getChild(current, segment);
  }

  return true;
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
