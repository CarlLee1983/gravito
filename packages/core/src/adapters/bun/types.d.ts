/**
 * Route Handler type (simplified for internal use)
 * In the full framework this will align with GravitoHandler
 */
export type RouteHandler = (...args: never[]) => unknown
/**
 * Route Match Result
 */
export interface RouteMatch {
  handlers: RouteHandler[]
  params: Record<string, string>
}
/**
 * Radix Node Type
 */
export declare enum NodeType {
  STATIC = 0,
  PARAM = 1,
  WILDCARD = 2,
}
//# sourceMappingURL=types.d.ts.map
