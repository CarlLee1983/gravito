import { type ExceptionOptions } from './GravitoException'
import { SystemException } from './SystemException'

/**
 * Thrown when the framework encounters an invalid or missing configuration value.
 * @public
 */
export class ConfigurationException extends SystemException {
  constructor(message: string, options: Omit<ExceptionOptions, 'message'> = {}) {
    super(500, 'system.configuration_error', { ...options, message })
    this.name = 'ConfigurationException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
