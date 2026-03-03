import type { ContentfulStatusCode } from '../http/types'
import { type ExceptionOptions, GravitoException } from './GravitoException'
/**
 * Generic HTTP Exception
 * @public
 */
export declare class HttpException extends GravitoException {
  constructor(status: ContentfulStatusCode, options?: ExceptionOptions)
}
