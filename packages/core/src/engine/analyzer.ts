/**
 * Handler Static Analyzer (Elysia-inspired)
 *
 * Analyzes handler functions to determine what request properties
 * they access, allowing for optimized code paths.
 */

/**
 * Represents the results of a static analysis performed on a handler function.
 *
 * @public
 * @since 3.0.0
 */
export interface HandlerAnalysis {
  usesHeaders: boolean
  usesQuery: boolean
  usesBody: boolean
  usesParams: boolean
  isAsync: boolean
}

/**
 * Analyze a handler function to detect what it accesses
 */
export function analyzeHandler(handler: Function): HandlerAnalysis {
  const source = handler.toString()

  return {
    usesHeaders:
      source.includes('.header(') ||
      source.includes('.header)') ||
      source.includes('.headers(') ||
      source.includes('.headers)'),
    usesQuery:
      source.includes('.query(') ||
      source.includes('.query)') ||
      source.includes('.queries(') ||
      source.includes('.queries)'),
    usesBody:
      source.includes('.json()') ||
      source.includes('.text()') ||
      source.includes('.formData()') ||
      source.includes('.body'),
    usesParams:
      source.includes('.param(') ||
      source.includes('.param)') ||
      source.includes('.params(') ||
      source.includes('.params)'),
    isAsync: source.includes('async') || source.includes('await'),
  }
}

/**
 * Determine optimal context type based on analysis
 */
export function getOptimalContextType(analysis: HandlerAnalysis): 'minimal' | 'fast' | 'full' {
  // If handler uses headers (setting response headers usually uses .header())
  // Any usage of .header should force fast context to be safe for now
  if (analysis.usesHeaders) {
    return 'fast'
  }

  // If handler doesn't use any request properties
  if (!analysis.usesQuery && !analysis.usesBody && !analysis.usesParams) {
    return 'minimal'
  }

  // If handler uses params but nothing else
  if (!analysis.usesQuery && !analysis.usesBody && analysis.usesParams) {
    return 'minimal'
  }

  // If handler uses body, needs full context (for async body parsing)
  if (analysis.usesBody) {
    return 'full'
  }

  return 'fast'
}
