import type { BindingKey } from '../Container'

/**
 * CircularDependencyException - Thrown when the container detects an infinite loop.
 *
 * @module @gravito/core
 */
export class CircularDependencyException extends Error {
  constructor(key: BindingKey, stack: BindingKey[]) {
    const path = [...stack, key].map(String).join(' -> ')
    super(`Circular dependency detected: ${path}`)
    this.name = 'CircularDependencyException'
  }
}
