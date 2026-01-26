/**
 * Echo 日誌事件
 */
export interface EchoLogEvent {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  context: {
    module: 'echo'
    component: 'receiver' | 'dispatcher' | 'dlq' | 'replay'
    [key: string]: unknown
  }
}

/**
 * Logger 介面
 */
export interface EchoLogger {
  debug(message: string, context?: Record<string, unknown>): void
  info(message: string, context?: Record<string, unknown>): void
  warn(message: string, context?: Record<string, unknown>): void
  error(message: string, context?: Record<string, unknown>): void
}
