/**
 * Base HTTP Error type for unified framework error handling.
 * When thrown from controllers or services, these are caught and formatted
 * by BaseController.handleError to return the correct HTTP status code.
 */
export class HttpError extends Error {
  /**
   * @param message - The error message.
   * @param statusCode - The HTTP status code associated with this error.
   */
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message)
    this.name = 'HttpError'
    Object.setPrototypeOf(this, HttpError.prototype)
  }
}

/**
 * 400 Bad Request
 */
export class BadRequestError extends HttpError {
  constructor(message: string) {
    super(message, 400)
    this.name = 'BadRequestError'
  }
}

/**
 * 404 Not Found
 */
export class NotFoundError extends HttpError {
  constructor(message: string) {
    super(message, 404)
    this.name = 'NotFoundError'
  }
}

/**
 * 409 Conflict
 */
export class ConflictError extends HttpError {
  constructor(message: string) {
    super(message, 409)
    this.name = 'ConflictError'
  }
}

/**
 * 422 Unprocessable Entity (Validation or Business logic violation)
 */
export class UnprocessableEntityError extends HttpError {
  constructor(message: string) {
    super(message, 422)
    this.name = 'UnprocessableEntityError'
  }
}
