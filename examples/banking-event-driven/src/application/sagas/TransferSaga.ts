import type { EventManager } from '@gravito/core'
import { TransferCompleted } from '../../domain/account/events/TransferCompleted'
import type { TransferCreditApplied } from '../../domain/account/events/TransferCreditApplied'
import type { TransferDebitApplied } from '../../domain/account/events/TransferDebitApplied'
import { TransferFailed } from '../../domain/account/events/TransferFailed'
import type { TransferInitiated } from '../../domain/account/events/TransferInitiated'
import type { DeadLetterListener } from '../../infrastructure/listeners/DeadLetterListener'
import {
  type IAccountRepository,
  OptimisticLockError,
} from '../../infrastructure/repositories/IAccountRepository'
import { dispatchAggregateEvents } from '../utils/EventDispatcher'

/**
 * Represents the current lifecycle state of a transfer saga.
 */
export type SagaStatus = 'initiated' | 'debit_applied' | 'credit_applied' | 'completed' | 'failed'

/**
 * State object stored for each active transfer saga.
 */
export interface SagaState {
  transferId: string
  fromAccountId: string
  toAccountId: string
  amountCents: number
  status: SagaStatus
  createdAt: Date
}

/**
 * Internal state tracking for TTL cleanup.
 */
interface SagaStateWithTTL extends SagaState {
  expiresAt: Date
}

/**
 * TransferSaga - Orchestrates a fund transfer using the Choreography pattern.
 *
 * This saga listens to domain events and triggers subsequent steps or compensation
 * operations to ensure eventual consistency across different account aggregates.
 *
 * Features:
 * - Automatic cleanup of completed/failed saga states (TTL = 10 minutes)
 * - Memory leak prevention with periodic cleanup intervals
 * - Detailed compensation logic with retry capabilities
 */
export class TransferSaga {
  /** In-memory storage for saga states. In production, this would be a persistent store. */
  private readonly sagaStates = new Map<string, SagaStateWithTTL>()

  /** Time-to-live for completed saga states (in milliseconds). Default: 10 minutes */
  private readonly sagaStatesTTL = 10 * 60 * 1000

  /** Cleanup interval ID for periodic removal of expired saga states */
  private cleanupIntervalId: NodeJS.Timeout | null = null

  constructor(
    private readonly repository: IAccountRepository,
    private readonly eventManager: EventManager,
    private readonly deadLetterListener: DeadLetterListener
  ) {
    // Start periodic cleanup of expired saga states
    this.startCleanupInterval()
  }

  /**
   * Starts the cleanup interval to remove expired saga states.
   * Runs every 5 minutes to clean up completed transfers.
   */
  private startCleanupInterval(): void {
    this.cleanupIntervalId = setInterval(
      () => {
        this.cleanupExpiredStates()
      },
      5 * 60 * 1000
    ) // Every 5 minutes

    // Prevent the interval from keeping the process alive
    if (this.cleanupIntervalId.unref) {
      this.cleanupIntervalId.unref()
    }
  }

  /**
   * Removes expired saga states to prevent memory leaks.
   * Called periodically by the cleanup interval.
   */
  private cleanupExpiredStates(): void {
    const now = new Date()
    const entriesToDelete: string[] = []

    for (const [transferId, state] of this.sagaStates.entries()) {
      if (now > state.expiresAt) {
        entriesToDelete.push(transferId)
      }
    }

    for (const transferId of entriesToDelete) {
      this.sagaStates.delete(transferId)
    }

    if (entriesToDelete.length > 0) {
      console.log(`[TransferSaga] Cleaned up ${entriesToDelete.length} expired saga states`)
    }
  }

  /**
   * Stops the cleanup interval (useful for graceful shutdown).
   */
  stopCleanupInterval(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId)
      this.cleanupIntervalId = null
    }
  }

  /**
   * Step 1: Listen for TransferInitiated and trigger debit application.
   * Uses optimistic concurrency control to detect concurrent modifications.
   *
   * @param event - The TransferInitiated event.
   */
  async handleTransferInitiated(event: TransferInitiated): Promise<void> {
    const { transferId, fromAccountId, toAccountId, amountCents } = event.payload

    // Initialize Saga State with TTL
    const now = new Date()
    this.sagaStates.set(transferId, {
      transferId,
      fromAccountId,
      toAccountId,
      amountCents,
      status: 'initiated',
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.sagaStatesTTL),
    })

    try {
      const fromAccount = await this.repository.findById(fromAccountId)
      if (!fromAccount) {
        throw new Error(`Source account not found: ${fromAccountId}`)
      }

      const versionBeforeModification = fromAccount.version

      // Apply debit to source account
      fromAccount.applyTransferDebit(amountCents, transferId)

      // Use optimistic lock to detect concurrent modifications
      await this.repository.saveWithOptimisticLock(fromAccount, versionBeforeModification)

      // Update Saga state
      const state = this.sagaStates.get(transferId)!
      this.sagaStates.set(transferId, { ...state, status: 'debit_applied' })

      // Dispatch resulting events (TransferDebitApplied)
      await dispatchAggregateEvents(fromAccount, this.eventManager)
    } catch (error) {
      // Trigger compensation if debit fails
      const errorMessage =
        error instanceof OptimisticLockError
          ? `CRITICAL: Concurrent modification detected. Another transaction modified account ${error.accountId} during this transfer.`
          : error instanceof Error
            ? error.message
            : 'Debit failed'

      await this.compensate(transferId, errorMessage)
    }
  }

  /**
   * Step 2: Listen for TransferDebitApplied and trigger credit application to target.
   * Uses optimistic concurrency control to detect concurrent modifications.
   *
   * @param event - The TransferDebitApplied event.
   */
  async handleTransferDebitApplied(event: TransferDebitApplied): Promise<void> {
    const { transferId } = event.payload
    const state = this.sagaStates.get(transferId)
    if (!state) {
      return
    }

    try {
      const toAccount = await this.repository.findById(state.toAccountId)
      if (!toAccount) {
        throw new Error(`Target account not found: ${state.toAccountId}`)
      }

      const versionBeforeModification = toAccount.version

      // Apply credit to target account
      toAccount.applyTransferCredit(state.amountCents, transferId)

      // Use optimistic lock to detect concurrent modifications
      await this.repository.saveWithOptimisticLock(toAccount, versionBeforeModification)

      // Update Saga state
      this.sagaStates.set(transferId, { ...state, status: 'credit_applied' })

      // Dispatch resulting events (TransferCreditApplied)
      await dispatchAggregateEvents(toAccount, this.eventManager)
    } catch (error) {
      // Compensation required: Refund the already debited amount
      const errorMessage =
        error instanceof OptimisticLockError
          ? `CRITICAL: Concurrent modification detected. Another transaction modified account ${error.accountId} during this transfer. Will attempt refund.`
          : error instanceof Error
            ? error.message
            : 'Credit application failed'

      await this.compensateWithRefund(transferId, state, errorMessage)
    }
  }

  /**
   * Step 3: Listen for TransferCreditApplied and finalize the saga.
   *
   * @param event - The TransferCreditApplied event.
   */
  async handleTransferCreditApplied(event: TransferCreditApplied): Promise<void> {
    const { transferId } = event.payload
    const state = this.sagaStates.get(transferId)
    if (!state) {
      return
    }

    this.sagaStates.set(transferId, { ...state, status: 'completed' })

    const completedEvent = new TransferCompleted(state.fromAccountId, {
      transferId,
      fromAccountId: state.fromAccountId,
      toAccountId: state.toAccountId,
      amountCents: state.amountCents,
    })

    // Dispatch final completion event
    await this.eventManager.dispatch(completedEvent as any)
  }

  /**
   * Compensation mechanism (when no refund is needed).
   *
   * @param transferId - The ID of the failed transfer.
   * @param reason - Description of the failure.
   */
  private async compensate(transferId: string, reason: string): Promise<void> {
    const state = this.sagaStates.get(transferId)
    if (!state) {
      return
    }

    this.sagaStates.set(transferId, { ...state, status: 'failed' })

    const failedEvent = new TransferFailed(state.fromAccountId, {
      transferId,
      fromAccountId: state.fromAccountId,
      toAccountId: state.toAccountId,
      amountCents: state.amountCents,
      reason,
    })

    // Log to dead letter queue
    this.deadLetterListener.handleTransferFailed(failedEvent)
    await this.eventManager.dispatch(failedEvent as any)
  }

  /**
   * Compensation mechanism with refund (when source has already been debited).
   *
   * @param transferId - The ID of the failed transfer.
   * @param state - Current state of the saga with TTL.
   * @param reason - Description of the failure.
   */
  private async compensateWithRefund(
    transferId: string,
    state: SagaStateWithTTL,
    reason: string
  ): Promise<void> {
    this.sagaStates.set(transferId, { ...state, status: 'failed' })

    let refundError: string | null = null

    try {
      // Refund the debited amount
      const fromAccount = await this.repository.findById(state.fromAccountId)
      if (fromAccount) {
        fromAccount.deposit(state.amountCents)
        await this.repository.save(fromAccount)
        fromAccount.pullDomainEvents() // Clear refund events to prevent infinite loops
      } else {
        refundError = `CRITICAL: Refund source account not found: ${state.fromAccountId}`
      }
    } catch (error) {
      // CRITICAL: Refund failed - funds were debited but not credited
      // This must be escalated to DLQ for manual intervention
      refundError = `CRITICAL: Refund failed after credit application failure. Error: ${error instanceof Error ? error.message : String(error)}`
    }

    // Create comprehensive failure event
    const failureReason = refundError ? `${reason} | ${refundError}` : reason

    const failedEvent = new TransferFailed(state.fromAccountId, {
      transferId,
      fromAccountId: state.fromAccountId,
      toAccountId: state.toAccountId,
      amountCents: state.amountCents,
      reason: failureReason,
    })

    // Always log to DLQ regardless of refund success
    // If refund failed, the CRITICAL prefix in reason will flag it for immediate manual review
    this.deadLetterListener.handleTransferFailed(failedEvent)
    await this.eventManager.dispatch(failedEvent as any)
  }

  /**
   * Retrieves the current state of a saga by transfer ID.
   *
   * @param transferId - The unique ID of the transfer.
   * @returns The saga state or null if not found.
   */
  getSagaState(transferId: string): SagaState | null {
    return this.sagaStates.get(transferId) ?? null
  }
}
