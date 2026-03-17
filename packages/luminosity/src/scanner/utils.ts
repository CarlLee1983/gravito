function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Extract parameter names from a route path.
 *
 * Supports various framework syntaxes:
 * - `:param` (Express, Hono, Gravito)
 * - `[param]` (Next.js, Nuxt)
 *
 * @param path - The route path to parse.
 * @returns An array of parameter names.
 *
 * @example
 * ```typescript
 * extractParams('/blog/:slug') // ['slug']
 * extractParams('/products/:category/:id') // ['category', 'id']
 * extractParams('/users/[id]') // ['id']
 * ```
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
 * Check if a path is a dynamic route.
 *
 * @param path - The route path to check.
 * @returns True if the path contains dynamic segments (':' or '[').
 */
export function isDynamicRoute(path: string): boolean {
  return path.includes(':') || path.includes('[')
}

/**
 * Normalize route path to use :param style.
 *
 * Converts framework-specific dynamic syntax (like `[param]`) into
 * the standard colon-prefixed style (`:param`) used internally.
 *
 * @param path - The raw route path.
 * @returns The normalized path.
 *
 * @example
 * ```typescript
 * normalizePath('/blog/[slug]') // '/blog/:slug'
 * ```
 */
export function normalizePath(path: string): string {
  // Convert [param] to :param
  return path.replace(/\[([^[\]]+)\]/g, ':$1')
}

/**
 * Replace parameters in a path with actual values.
 *
 * @param path - The dynamic route path.
 * @param params - A map of parameter names to values.
 * @returns The resolved URL path.
 *
 * @example
 * ```typescript
 * replaceParams('/blog/:slug', { slug: 'hello-world' }) // '/blog/hello-world'
 * ```
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
 * Check if a path matches any of the given patterns.
 *
 * Supports both string globs (with `*` wildcards) and regular expressions.
 *
 * @param path - The path to check.
 * @param patterns - An array of patterns to match against.
 * @returns True if the path matches at least one pattern.
 */
export function matchesPatterns(path: string, patterns: (string | RegExp)[]): boolean {
  for (const pattern of patterns) {
    if (typeof pattern === 'string') {
      // Simple glob-like matching
      const regex = new RegExp(
        `^${escapeRegex(pattern).replace(/\\\*/g, '.*').replace(/\\\?/g, '.')}$`
      )
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
