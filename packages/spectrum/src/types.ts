/**
 * @gravito/spectrum - Types
 */

/**
 * Represents a detailed snapshot of an HTTP request processed by the application.
 *
 * @public
 * @since 3.0.0
 */
export interface CapturedRequest {
  /** Unique execution ID. */
  id: string
  /** HTTP Method (GET, POST, etc.). */
  method: string
  /** URL Path. */
  path: string
  /** Full URL. */
  url: string
  /** HTTP response status code. */
  status: number
  /** Processing duration in milliseconds. */
  duration: number
  /** Epoch timestamp of when the request started. */
  startTime: number
  /** Client IP address. */
  ip: string
  /** Client user agent string. */
  userAgent?: string
  /** Incoming request headers. */
  requestHeaders: Record<string, string>
  /** Outgoing response headers. */
  responseHeaders: Record<string, string>
  /** Parsed request body (if captured). */
  requestBody?: any
  /** Parsed response body (if captured). */
  responseBody?: any
  /** Request ID for correlation with logs and queries. */
  requestId?: string
}

/**
 * Represents a log entry captured during application execution.
 *
 * @public
 * @since 3.0.0
 */
export interface CapturedLog {
  /** Unique log entry ID. */
  id: string
  /** Log severity level. */
  level: 'debug' | 'info' | 'warn' | 'error'
  /** The primary log message text. */
  message: string
  /** Additional arguments passed to the logger. */
  args: any[]
  /** Epoch timestamp when the log was generated. */
  timestamp: number
  /** Request ID for correlation with the originating request. */
  requestId?: string
}

/**
 * Represents a database query captured during application execution.
 *
 * @public
 * @since 3.0.0
 */
export interface CapturedQuery {
  /** Unique query execution ID. */
  id: string
  /** The name of the database connection used. */
  connection: string
  /** The raw or prepared SQL statement. */
  sql: string
  /** Prepared statement bindings/parameters. */
  bindings: any[]
  /** Query execution duration in milliseconds. */
  duration: number
  /** Epoch timestamp when the query was executed. */
  timestamp: number
  /** Request ID for correlation with the originating request. */
  requestId?: string
}
