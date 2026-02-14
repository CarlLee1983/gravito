/**
 * 結構化日誌服務
 *
 * 提供結構化的日誌記錄功能，支持多個日誌級別、上下文信息和環境感知
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  requestId?: string
  userId?: string
  [key: string]: any
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: {
    message: string
    stack?: string
    code?: string
  }
  metadata?: Record<string, any>
}

export class Logger {
  private context: LogContext = {}
  private isProduction: boolean

  constructor(context: LogContext = {}) {
    this.context = context
    this.isProduction = process.env.NODE_ENV === 'production'
  }

  /**
   * 設置日誌上下文
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context }
  }

  /**
   * 清除日誌上下文
   */
  clearContext(): void {
    this.context = {}
  }

  /**
   * 創建子 Logger（繼承上下文）
   */
  child(context: LogContext): Logger {
    return new Logger({ ...this.context, ...context })
  }

  /**
   * 調試級別日誌
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', message, metadata)
  }

  /**
   * 信息級別日誌
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, metadata)
  }

  /**
   * 警告級別日誌
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, metadata)
  }

  /**
   * 錯誤級別日誌
   */
  error(message: string, error?: Error | unknown, metadata?: Record<string, any>): void {
    const errorInfo = this.formatError(error)
    this.log('error', message, { ...metadata, error: errorInfo })
  }

  /**
   * 內部日誌方法
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      metadata,
    }

    // 生產環境：JSON 格式
    if (this.isProduction) {
      console.log(JSON.stringify(entry))
    } else {
      // 開發環境：彩色格式化輸出
      this.logFormatted(entry)
    }
  }

  /**
   * 格式化錯誤信息
   */
  private formatError(error: unknown): { message: string; stack?: string; code?: string } {
    if (error instanceof Error) {
      const result: { message: string; stack?: string; code?: string } = {
        message: error.message,
      }

      if (error.stack) {
        result.stack = error.stack
      }

      if ('code' in error) {
        result.code = String((error as Record<string, any>).code)
      }

      return result
    }

    return {
      message: String(error),
    }
  }

  /**
   * 開發環境彩色格式化輸出
   */
  private logFormatted(entry: LogEntry): void {
    const colors = {
      debug: '\x1b[36m', // 青色
      info: '\x1b[32m', // 綠色
      warn: '\x1b[33m', // 黃色
      error: '\x1b[31m', // 紅色
      reset: '\x1b[0m',
    }

    const color = colors[entry.level]
    const timestamp = entry.timestamp
    const level = entry.level.toUpperCase()

    let contextStr = ''
    const contextKeys = entry.context ? Object.keys(entry.context) : []
    if (contextKeys.length > 0) {
      const contextParts: string[] = []
      if (entry.context) {
        for (const [key, value] of Object.entries(entry.context)) {
          if (value) {
            contextParts.push(`${key}=${value}`)
          }
        }
      }
      if (contextParts.length > 0) {
        contextStr = ` [${contextParts.join(', ')}]`
      }
    }

    let metadataStr = ''
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      metadataStr = ` ${JSON.stringify(entry.metadata)}`
    }

    const message = `${color}${level}${colors.reset} [${timestamp}]${contextStr} ${entry.message}${metadataStr}`
    console.log(message)
  }
}

/**
 * 全局 Logger 實例
 */
let globalLogger: Logger | null = null

/**
 * 獲取全局 Logger 實例
 */
export function getLogger(context?: LogContext): Logger {
  if (!globalLogger) {
    globalLogger = new Logger(context)
  } else if (context) {
    globalLogger.setContext(context)
  }
  return globalLogger
}

/**
 * 設置全局 Logger 實例
 */
export function setLogger(logger: Logger): void {
  globalLogger = logger
}

/**
 * 重置全局 Logger
 */
export function resetLogger(): void {
  globalLogger = null
}
