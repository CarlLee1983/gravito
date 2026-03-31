import type { ExceptionOptions } from './GravitoException'
import { SystemException } from './SystemException'

/**
 * Thrown when a Lite Satellite name or container binding key is registered more than once.
 * In dev mode, this throws. In production, the framework warns and skips.
 * @public
 */
export class ContainerBindingCollisionException extends SystemException {
  constructor(message: string, options: Omit<ExceptionOptions, 'message'> = {}) {
    super(500, 'system.container_binding_collision', { ...options, message })
    this.name = 'ContainerBindingCollisionException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
