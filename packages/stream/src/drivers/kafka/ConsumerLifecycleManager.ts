import { EventEmitter } from 'node:events'
import type { ConsumerLifecycleState, LifecycleEvent } from './types'

/**
 * Manages consumer lifecycle state transitions and events.
 *
 * State transitions:
 * - idle → starting → running → stopping → stopped
 * - running → restarting → running
 * - any state → error
 *
 * Emits lifecycle events on state changes for coordination with other components.
 *
 * @public
 */
export class ConsumerLifecycleManager extends EventEmitter {
  private currentState: ConsumerLifecycleState = 'idle'
  private previousState: ConsumerLifecycleState = 'idle'
  private lastTransitionTime = Date.now()
  private stateHistory: Array<{ state: ConsumerLifecycleState; timestamp: number }> = [
    { state: 'idle', timestamp: this.lastTransitionTime },
  ]

  /**
   * Register a listener for lifecycle events.
   * Event data: { state, previousState, timestamp, error? }
   */
  onStateChange(listener: (event: LifecycleEvent) => void): void {
    this.on('stateChange', listener)
  }

  /**
   * Start the consumer (transition idle → starting → running).
   */
  async start(): Promise<void> {
    if (this.currentState !== 'idle') {
      throw new Error(`Cannot start from state '${this.currentState}'`)
    }

    this.transition('starting')
    try {
      // Simulate consumer startup delay
      await new Promise((resolve) => setImmediate(resolve))
      this.transition('running')
    } catch (error) {
      this.transitionError(error as Error)
      throw error
    }
  }

  /**
   * Restart the consumer (running → restarting → running).
   */
  async restart(): Promise<void> {
    if (this.currentState !== 'running') {
      throw new Error(`Cannot restart from state '${this.currentState}'`)
    }

    this.transition('restarting')
    try {
      // Simulate consumer restart delay
      await new Promise((resolve) => setImmediate(resolve))
      this.transition('running')
    } catch (error) {
      this.transitionError(error as Error)
      throw error
    }
  }

  /**
   * Stop the consumer (running/starting → stopping → stopped).
   */
  async stop(): Promise<void> {
    if (this.currentState === 'stopped' || this.currentState === 'idle') {
      return // Already stopped or not started
    }

    this.transition('stopping')
    try {
      // Simulate consumer shutdown delay
      await new Promise((resolve) => setImmediate(resolve))
      this.transition('stopped')
    } catch (error) {
      this.transitionError(error as Error)
      throw error
    }
  }

  /**
   * Reset to idle state (for testing/reuse).
   */
  reset(): void {
    this.currentState = 'idle'
    this.previousState = 'idle'
    this.lastTransitionTime = Date.now()
    this.stateHistory = [{ state: 'idle', timestamp: this.lastTransitionTime }]
  }

  /**
   * Get current lifecycle state.
   */
  getState(): ConsumerLifecycleState {
    return this.currentState
  }

  /**
   * Get previous lifecycle state.
   */
  getPreviousState(): ConsumerLifecycleState {
    return this.previousState
  }

  /**
   * Get last state transition timestamp.
   */
  getLastTransitionTime(): number {
    return this.lastTransitionTime
  }

  /**
   * Get state transition history.
   */
  getStateHistory(): Array<{ state: ConsumerLifecycleState; timestamp: number }> {
    return [...this.stateHistory]
  }

  /**
   * Check if consumer is in running state.
   */
  isRunning(): boolean {
    return this.currentState === 'running'
  }

  /**
   * Check if consumer is in error state.
   */
  isError(): boolean {
    return this.currentState === 'error'
  }

  /**
   * Check if consumer is stopped.
   */
  isStopped(): boolean {
    return this.currentState === 'stopped'
  }

  /**
   * Internal: transition to new state and emit event.
   */
  private transition(newState: ConsumerLifecycleState): void {
    this.previousState = this.currentState
    this.currentState = newState
    this.lastTransitionTime = Date.now()
    this.stateHistory.push({ state: newState, timestamp: this.lastTransitionTime })

    // Keep history to last 100 transitions
    if (this.stateHistory.length > 100) {
      this.stateHistory.shift()
    }

    const event: LifecycleEvent = {
      state: newState,
      previousState: this.previousState,
      timestamp: this.lastTransitionTime,
    }

    this.emit('stateChange', event)
  }

  /**
   * Internal: transition to error state with error details.
   */
  private transitionError(error: Error): void {
    this.previousState = this.currentState
    this.currentState = 'error'
    this.lastTransitionTime = Date.now()
    this.stateHistory.push({ state: 'error', timestamp: this.lastTransitionTime })

    const event: LifecycleEvent = {
      state: 'error',
      previousState: this.previousState,
      timestamp: this.lastTransitionTime,
      error,
    }

    this.emit('stateChange', event)
  }
}
