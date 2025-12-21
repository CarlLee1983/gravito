import { GravitoException, type ExceptionOptions } from './GravitoException'
import type { ContentfulStatusCode } from '../http/types'

export class HttpException extends GravitoException {
    constructor(status: ContentfulStatusCode, options: ExceptionOptions = {}) {
        super(status, 'HTTP_ERROR', options)
        this.name = 'HttpException'
    }
}
