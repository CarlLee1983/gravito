/**
 * Deep serialize object, handling special types.
 */
export function deepSerialize(obj: unknown, seen = new WeakSet()): unknown {
  // Handle null and primitives
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  // Prevent circular references
  if (seen.has(obj as object)) {
    return '[Circular]'
  }
  seen.add(obj as object)

  // Handle Date
  if (obj instanceof Date) {
    return { __type: 'Date', value: obj.toISOString() }
  }

  // Handle Map
  if (obj instanceof Map) {
    return {
      __type: 'Map',
      value: Array.from(obj.entries()).map(([k, v]) => [
        deepSerialize(k, seen),
        deepSerialize(v, seen),
      ]),
    }
  }

  // Handle Set
  if (obj instanceof Set) {
    return {
      __type: 'Set',
      value: Array.from(obj).map((v) => deepSerialize(v, seen)),
    }
  }

  // Handle Array
  if (Array.isArray(obj)) {
    return obj.map((item) => deepSerialize(item, seen))
  }

  // Handle Plain Object
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (!key.startsWith('_') && typeof value !== 'function') {
      result[key] = deepSerialize(value, seen)
    }
  }
  return result
}

/**
 * Deserialize object, restoring special types.
 */
export function deepDeserialize(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  // Restore special types
  if ('__type' in (obj as Record<string, unknown>)) {
    const typed = obj as { __type: string; value: unknown }
    switch (typed.__type) {
      case 'Date':
        return new Date(typed.value as string)
      case 'Map':
        return new Map(
          (typed.value as [unknown, unknown][]).map(([k, v]) => [
            deepDeserialize(k),
            deepDeserialize(v),
          ])
        )
      case 'Set':
        return new Set((typed.value as unknown[]).map((v) => deepDeserialize(v)))
    }
  }

  // Handle Array
  if (Array.isArray(obj)) {
    return obj.map((item) => deepDeserialize(item))
  }

  // Handle Plain Object
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key] = deepDeserialize(value)
  }
  return result
}
