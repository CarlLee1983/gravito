import type { EchoLogger } from './EchoLogger'

export class ConsoleEchoLogger implements EchoLogger {
  private formatContext(
    base: Record<string, unknown>,
    extra?: Record<string, unknown>
  ): Record<string, unknown> {
    return {
      module: 'echo',
      timestamp: new Date().toISOString(),
      ...base,
      ...extra,
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    console.debug(
      JSON.stringify({
        level: 'debug',
        message,
        ...this.formatContext({}, context),
      })
    )
  }

  info(message: string, context?: Record<string, unknown>): void {
    console.info(
      JSON.stringify({
        level: 'info',
        message,
        ...this.formatContext({}, context),
      })
    )
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(
      JSON.stringify({
        level: 'warn',
        message,
        ...this.formatContext({}, context),
      })
    )
  }

  error(message: string, context?: Record<string, unknown>): void {
    console.error(
      JSON.stringify({
        level: 'error',
        message,
        ...this.formatContext({}, context),
      })
    )
  }
}
