/**
 * @fileoverview State Machine for workflow status transitions
 *
 * Pure state machine with no runtime dependencies.
 *
 * @module @gravito/flux/core
 */

import type { WorkflowStatus } from '../types'

/**
 * Valid state transitions
 */
const TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  pending: ['running', 'failed'],
  running: ['paused', 'completed', 'failed', 'suspended', 'rolling_back'],
  paused: ['running', 'failed'],
  suspended: ['running', 'failed'],
  rolling_back: ['rolled_back', 'failed'],
  rolled_back: ['pending'], // allow retry from scratch
  completed: [], // terminal state
  failed: ['pending'], // allow retry
}

/**
 * State Machine for workflow status management
 *
 * Provides validated state transitions using EventTarget for events.
 */
export class StateMachine extends EventTarget {
  private _status: WorkflowStatus = 'pending'

  /**
   * Current status
   */
  get status(): WorkflowStatus {
    return this._status
  }

  /**
   * Check if transition to target status is allowed
   */
  canTransition(to: WorkflowStatus): boolean {
    return TRANSITIONS[this._status].includes(to)
  }

  /**
   * Transition to a new status
   *
   * @throws {Error} If transition is not allowed
   */
  transition(to: WorkflowStatus): void {
    if (!this.canTransition(to)) {
      throw new Error(`Invalid state transition: ${this._status} → ${to}`)
    }

    const from = this._status
    this._status = to

    // Emit transition event
    this.dispatchEvent(
      new CustomEvent('transition', {
        detail: { from, to },
      })
    )
  }

  /**
   * Force set status (for replay/restore)
   */
  forceStatus(status: WorkflowStatus): void {
    this._status = status
  }

  /**
   * Check if workflow is in terminal state
   */
  isTerminal(): boolean {
    return (
      this._status === 'completed' || this._status === 'failed' || this._status === 'rolled_back'
    )
  }

  /**
   * Check if workflow can be executed
   */
  canExecute(): boolean {
    return this._status === 'pending' || this._status === 'paused'
  }
}
