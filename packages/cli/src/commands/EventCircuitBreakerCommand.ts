import { Painter as pc } from '@gravito/chromatic'

export interface CircuitBreakerStatus {
  listenerName: string
  state: 'OPEN' | 'CLOSED' | 'HALF_OPEN'
  failureCount: number
  failureThreshold: number
  nextResetAt: number
  lastFailureAt?: number
  lastError?: {
    message: string
  }
}

/**
 * Circuit Breaker Status Display and Monitoring Command
 *
 * Provides operations for monitoring event listener circuit breakers:
 * - Display circuit breaker states
 * - Show detailed status information
 * - View circuit breaker statistics
 *
 * @example
 * ```typescript
 * const cbCommand = new EventCircuitBreakerCommand()
 *
 * // List all circuit breaker states
 * await cbCommand.status([status1, status2])
 *
 * // Get detailed status for a listener
 * await cbCommand.show(status)
 *
 * // Get statistics
 * await cbCommand.stats([status1, status2])
 * ```
 *
 * @since 1.2.0
 * @public
 */
export class EventCircuitBreakerCommand {
  /**
   * Display status of circuit breakers.
   *
   * @param statuses - Array of circuit breaker statuses to display
   */
  async status(statuses: CircuitBreakerStatus[]): Promise<void> {
    if (statuses.length === 0) {
      console.log(pc.yellow('No circuit breakers registered.'))
      return
    }

    console.log(pc.bold('\n🔌 Circuit Breaker Status'))
    console.log(pc.gray('─'.repeat(100)))

    const headers = ['Listener', 'State', 'Failures', 'Threshold', 'Next Reset']
    console.log(headers.map((h) => pc.bold(h)).join(' │ '))
    console.log(pc.gray('─'.repeat(100)))

    for (const status of statuses.sort((a, b) => {
      // Sort by state priority: OPEN > HALF_OPEN > CLOSED
      const priority: Record<string, number> = { OPEN: 0, HALF_OPEN: 1, CLOSED: 2 }
      return priority[a.state] - priority[b.state]
    })) {
      const stateColor =
        status.state === 'OPEN' ? pc.red : status.state === 'HALF_OPEN' ? pc.yellow : pc.green

      const nextResetTime =
        status.state === 'OPEN' ? `${Math.ceil((status.nextResetAt - Date.now()) / 1000)}s` : '─'

      console.log(
        [
          status.listenerName,
          stateColor(status.state),
          String(status.failureCount).padStart(8),
          String(status.failureThreshold).padStart(9),
          nextResetTime.padStart(11),
        ].join(' │ ')
      )
    }

    console.log(pc.gray('─'.repeat(100)))
  }

  /**
   * Display detailed status for a specific listener.
   *
   * @param status - Circuit breaker status to display
   */
  async show(status: CircuitBreakerStatus): Promise<void> {
    const stateColor =
      status.state === 'OPEN' ? pc.bgRed : status.state === 'HALF_OPEN' ? pc.bgYellow : pc.bgGreen

    console.log(pc.bold('\n📋 Circuit Breaker Details'))
    console.log(pc.gray('─'.repeat(80)))

    console.log(`Listener:         ${pc.bold(status.listenerName)}`)
    console.log(`State:            ${stateColor(` ${status.state} `)}`)
    console.log(`Failure Count:    ${status.failureCount}/${status.failureThreshold}`)
    console.log(
      `Last Failure At:  ${status.lastFailureAt ? new Date(status.lastFailureAt).toISOString() : 'Never'}`
    )
    console.log(
      `Next Reset At:    ${status.state === 'OPEN' ? new Date(status.nextResetAt).toISOString() : '─'}`
    )

    if (status.lastError) {
      console.log(`Last Error:       ${status.lastError.message}`)
    }

    console.log(pc.gray('─'.repeat(80)))
    console.log()
  }

  /**
   * Get circuit breaker statistics.
   *
   * @param statuses - Array of circuit breaker statuses
   */
  async stats(statuses: CircuitBreakerStatus[]): Promise<void> {
    if (statuses.length === 0) {
      console.log(pc.yellow('No circuit breakers registered.'))
      return
    }

    const openCount = statuses.filter((s) => s.state === 'OPEN').length
    const halfOpenCount = statuses.filter((s) => s.state === 'HALF_OPEN').length
    const closedCount = statuses.filter((s) => s.state === 'CLOSED').length

    console.log(pc.bold('\n📊 Circuit Breaker Statistics'))
    console.log(pc.gray('─'.repeat(50)))

    console.log(`Total Listeners: ${pc.bold(String(statuses.length))}`)
    console.log(`  ${pc.green('●')} CLOSED:     ${closedCount}`)
    console.log(`  ${pc.yellow('●')} HALF_OPEN: ${halfOpenCount}`)
    console.log(`  ${pc.red('●')} OPEN:      ${openCount}`)

    const totalFailures = statuses.reduce((sum, s) => sum + s.failureCount, 0)
    console.log(`\nTotal Failures: ${totalFailures}`)

    console.log(pc.gray('─'.repeat(50)))
    console.log()
  }
}
