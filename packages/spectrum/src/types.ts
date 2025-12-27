/**
 * @gravito/spectrum - Types
 */

export interface CapturedRequest {
  id: string
  method: string
  path: string
  url: string
  status: number
  duration: number
  startTime: number
  ip: string
  userAgent?: string
  requestHeaders: Record<string, string>
  responseHeaders: Record<string, string>
  requestBody?: any
  responseBody?: any
}

export interface CapturedLog {
  id: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  args: any[]
  timestamp: number
}

export interface CapturedQuery {
  id: string
  connection: string
  sql: string
  bindings: any[]
  duration: number
  timestamp: number
}
