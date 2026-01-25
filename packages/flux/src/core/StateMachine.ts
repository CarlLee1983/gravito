/**
 * @fileoverview State Machine for workflow status transitions
 *
 * Pure state machine with no runtime dependencies.
 *
 * @module @gravito/flux/core
 */

import type { WorkflowStatus } from '../types'

/**
 * Defines the authoritative set of allowed status transitions for a workflow.
 *
 * This map ensures that workflows follow a logical progression and prevents
 * illegal state jumps (e.g., from 'completed' back to 'running').
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
 * Manages the lifecycle states of a workflow instance.
 *
 * The StateMachine enforces transition rules and notifies listeners of state changes.
 * It is designed to be the single source of truth for a workflow's current progress.
 *
 * @example
 * ```typescript
 * const sm = new StateMachine();
 * sm.addEventListener('transition', (e) => console.log(e.detail));
 * sm.transition('running');
 * ```
 */
export class StateMachine extends EventTarget {
  private _status: WorkflowStatus = 'pending'

  /**
   * The current operational status of the workflow.
   */
  get status(): WorkflowStatus {
    return this._status
  }

  /**
   * Evaluates if a transition to the specified status is valid from the current state.
   *
   * @param to - The target status to check.
   * @returns True if the transition is permitted by the transition map.
   */
  canTransition(to: WorkflowStatus): boolean {
    return TRANSITIONS[this._status].includes(to)
  }

  /**
   * Moves the workflow to a new status if the transition is valid.
   *
   * @param to - The target status.
   * @throws {Error} If the transition is illegal according to the defined rules.
   *
   * @example
   * ```typescript
   * try {
   *   sm.transition('completed');
   * } catch (e) {
   *   // Handle invalid transition
   * }
   * ```
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
   * Overrides the current status without validation.
   *
   * This should only be used during workflow restoration from persisted storage
   * or when replaying history where the state is already known to be valid.
   *
   * @param status - The status to force set.
   */
  forceStatus(status: WorkflowStatus): void {
    this._status = status
  }

  /**
   * Determines if the workflow has reached a state where no further execution is possible.
   *
   * @returns True if the status is 'completed', 'failed', or 'rolled_back'.
   */
  isTerminal(): boolean {
    return (
      this._status === 'completed' || this._status === 'failed' || this._status === 'rolled_back'
    )
  }

  /**
   * Checks if the workflow is in a state that allows for execution or resumption.
   *
   * @returns True if the workflow can be started or resumed.
   */
  canExecute(): boolean {
    return this._status === 'pending' || this._status === 'paused' || this._status === 'suspended'
  }
}
