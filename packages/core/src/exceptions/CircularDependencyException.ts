import type { ServiceKey } from '../Container'

/**
 * CircularDependencyException - Thrown when the container detects an infinite loop.
 *
 * @module @gravito/core
 */
export class CircularDependencyException extends Error {
  constructor(key: ServiceKey, stack: ServiceKey[]) {
    const path = [...stack, key].map(String).join(' -> ')
    super(`Circular dependency detected: ${path}`)
    this.name = 'CircularDependencyException'
  }
}
