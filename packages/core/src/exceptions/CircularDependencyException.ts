import type { ServiceKey } from '../Container'
import { SystemException } from './SystemException'

/**
 * CircularDependencyException - Thrown when the container detects an infinite loop.
 *
 * @module @gravito/core
 */
export class CircularDependencyException extends SystemException {
  constructor(key: ServiceKey, stack: ServiceKey[]) {
    const path = [...stack, key].map(String).join(' -> ')
    super(500, 'system.circular_dependency', {
      message: `Circular dependency detected: ${path}`,
    })
    this.name = 'CircularDependencyException'
  }
}
