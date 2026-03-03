import type { ServiceKey } from '../Container'
/**
 * CircularDependencyException - Thrown when the container detects an infinite loop.
 *
 * @module @gravito/core
 */
export declare class CircularDependencyException extends Error {
  constructor(key: ServiceKey, stack: ServiceKey[])
}
