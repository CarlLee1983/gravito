import { type InfrastructureExceptionOptions, StorageException } from '@gravito/core'
import type { NebulaS3ErrorCode } from './codes'

/**
 * Concrete error class for the nebula-s3 (AWS S3 storage) package.
 * Extends StorageException to participate in the GravitoException hierarchy.
 * @public
 */
export class NebulaS3Error extends StorageException {
  override name = 'NebulaS3Error'

  constructor(
    status: number,
    code: NebulaS3ErrorCode,
    options: InfrastructureExceptionOptions = {}
  ) {
    super(status, code, options)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
