import type { HttpMethod } from '../../http/types'
import { type RouteHandler, type RouteMatch } from './types'
/**
 * High-performance Radix Tree Router for Bun
 */
export declare class RadixRouter {
  private root
  private globalConstraints
  private routeCache
  /**
   * Add a generic parameter constraint
   */
  where(param: string, regex: RegExp): void
  /**
   * Register a route
   */
  add(method: HttpMethod, path: string, handlers: RouteHandler[]): void
  /**
   * Match a request
   */
  match(method: string, path: string): RouteMatch | null
  private matchRecursive
  private splitPath
  /**
   * Serialize the router to a JSON string
   */
  serialize(): string
  /**
   * Restore a router from a serialized JSON string
   */
  static fromSerialized(json: string): RadixRouter
}
