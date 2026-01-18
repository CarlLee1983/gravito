/**
 * Recursively merge two objects or arrays.
 *
 * For arrays, it performs a deduplicated union.
 * For objects, it merges nested properties.
 *
 * @param target - The base object to merge into.
 * @param source - The object containing properties to merge.
 * @returns A new object or array representing the merged result.
 *
 * @public
 * @since 3.0.0
 */
export function deepMerge(target: any, source: any): any {
  if (typeof target !== 'object' || target === null) {
    return source
  }
  if (typeof source !== 'object' || source === null) {
    return source
  }

  if (Array.isArray(target) && Array.isArray(source)) {
    return Array.from(new Set([...target, ...source]))
  }

  const output = { ...target }
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target) {
      output[key] = deepMerge(target[key], source[key])
    } else {
      output[key] = source[key]
    }
  }
  return output
}
