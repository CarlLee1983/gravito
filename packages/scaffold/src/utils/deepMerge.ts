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
