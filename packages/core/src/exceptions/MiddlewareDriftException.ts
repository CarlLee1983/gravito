import { type ExceptionOptions } from './GravitoException'
import { SystemException } from './SystemException'

/**
 * Thrown when middleware or routes are added after the server configuration
 * has been snapshotted (e.g., after serveConfig() is called).
 * @public
 */
export class MiddlewareDriftException extends SystemException {
  constructor(message: string, options: Omit<ExceptionOptions, 'message'> = {}) {
    super(500, 'system.middleware_drift', { ...options, message })
    this.name = 'MiddlewareDriftException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
