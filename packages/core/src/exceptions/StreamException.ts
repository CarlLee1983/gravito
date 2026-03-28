import { InfrastructureException, type InfrastructureExceptionOptions } from './InfrastructureException'

/**
 * Abstract base class for stream/message processing infrastructure errors.
 * Used by the stream package (Kafka, RabbitMQ, SQS).
 * @public
 */
export abstract class StreamException extends InfrastructureException {
  constructor(status: number, code: string, options: InfrastructureExceptionOptions = {}) {
    super(status, code, options)
    this.name = 'StreamException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
