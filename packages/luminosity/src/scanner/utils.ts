/**
 * Extract parameter names from a route path
 *
 * @example
 * extractParams('/blog/:slug') // ['slug']
 * extractParams('/products/:category/:id') // ['category', 'id']
 * extractParams('/users/[id]') // ['id'] (Next.js/Nuxt style)
 */
export function extractParams(path: string): string[] {
  const params: string[] = []

  // Match :param style (Express/Hono/Gravito)
  const colonMatches = path.match(/:([^/]+)/g)
  if (colonMatches) {
    params.push(...colonMatches.map((m) => m.slice(1)))
  }

  // Match [param] style (Next.js/Nuxt)
  const bracketMatches = path.match(/\[([^[\]]+)\]/g)
  if (bracketMatches) {
    params.push(...bracketMatches.map((m) => m.slice(1, -1)))
  }

  return params
}

/**
 * Check if a path is a dynamic route
 */
export function isDynamicRoute(path: string): boolean {
  return path.includes(':') || path.includes('[')
}

/**
 * Normalize route path to use :param style
 *
 * @example
 * normalizePath('/blog/[slug]') // '/blog/:slug'
 * normalizePath('/blog/:slug') // '/blog/:slug'
 */
export function normalizePath(path: string): string {
  // Convert [param] to :param
  return path.replace(/\[([^[\]]+)\]/g, ':$1')
}

/**
 * Replace parameters in a path with actual values
 *
 * @example
 * replaceParams('/blog/:slug', { slug: 'hello-world' }) // '/blog/hello-world'
 */
export function replaceParams(path: string, params: Record<string, string | number>): string {
  let result = path
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`:${key}`, String(value))
    result = result.replace(`[${key}]`, String(value))
  }
  return result
}

/**
 * Check if a path matches any of the given patterns
 */
export function matchesPatterns(path: string, patterns: (string | RegExp)[]): boolean {
  for (const pattern of patterns) {
    if (typeof pattern === 'string') {
      // Simple glob-like matching
      const regex = new RegExp(`^${pattern.replace(/\*/g, '.*').replace(/\?/g, '.')}$`)
      if (regex.test(path)) {
        return true
      }
    } else if (pattern instanceof RegExp) {
      if (pattern.test(path)) {
        return true
      }
    }
  }
  return false
}
