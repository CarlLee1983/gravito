import type { EventManager } from '@gravito/core'
import { TransferCompleted } from '../../domain/account/events/TransferCompleted'
import type { TransferCreditApplied } from '../../domain/account/events/TransferCreditApplied'
import type { TransferDebitApplied } from '../../domain/account/events/TransferDebitApplied'
import { TransferFailed } from '../../domain/account/events/TransferFailed'
import type { TransferInitiated } from '../../domain/account/events/TransferInitiated'
import type { DeadLetterListener } from '../../infrastructure/listeners/DeadLetterListener'
import type { IAccountRepository } from '../../infrastructure/repositories/IAccountRepository'
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
 * TransferSaga - Orchestrates a fund transfer using the Choreography pattern.
 *
 * This saga listens to domain events and triggers subsequent steps or compensation
 * operations to ensure eventual consistency across different account aggregates.
 */
export class TransferSaga {
  /** In-memory storage for saga states. In production, this would be a persistent store. */
  private readonly sagaStates = new Map<string, SagaState>()

  constructor(
    private readonly repository: IAccountRepository,
    private readonly eventManager: EventManager,
    private readonly deadLetterListener: DeadLetterListener
  ) {}

  /**
   * Step 1: Listen for TransferInitiated and trigger debit application.
   *
   * @param event - The TransferInitiated event.
   */
  async handleTransferInitiated(event: TransferInitiated): Promise<void> {
    const { transferId, fromAccountId, toAccountId, amountCents } = event.payload

    // Initialize Saga State
    this.sagaStates.set(transferId, {
      transferId,
      fromAccountId,
      toAccountId,
      amountCents,
      status: 'initiated',
      createdAt: new Date(),
    })

    try {
      const fromAccount = await this.repository.findById(fromAccountId)
      if (!fromAccount) {
        throw new Error(`Source account not found: ${fromAccountId}`)
      }

      // Apply debit to source account
      fromAccount.applyTransferDebit(amountCents, transferId)
      await this.repository.save(fromAccount)

      // Update Saga state
      const state = this.sagaStates.get(transferId)!
      this.sagaStates.set(transferId, { ...state, status: 'debit_applied' })

      // Dispatch resulting events (TransferDebitApplied)
      await dispatchAggregateEvents(fromAccount, this.eventManager)
    } catch (error) {
      // Trigger compensation if debit fails
      await this.compensate(transferId, error instanceof Error ? error.message : 'Debit failed')
    }
  }

  /**
   * Step 2: Listen for TransferDebitApplied and trigger credit application to target.
   *
   * @param event - The TransferDebitApplied event.
   */
  async handleTransferDebitApplied(event: TransferDebitApplied): Promise<void> {
    const { transferId } = event.payload
    const state = this.sagaStates.get(transferId)
    if (!state) return

    try {
      const toAccount = await this.repository.findById(state.toAccountId)
      if (!toAccount) {
        throw new Error(`Target account not found: ${state.toAccountId}`)
      }

      // Apply credit to target account
      toAccount.applyTransferCredit(state.amountCents, transferId)
      await this.repository.save(toAccount)

      // Update Saga state
      this.sagaStates.set(transferId, { ...state, status: 'credit_applied' })

      // Dispatch resulting events (TransferCreditApplied)
      await dispatchAggregateEvents(toAccount, this.eventManager)
    } catch (error) {
      // Compensation required: Refund the already debited amount
      await this.compensateWithRefund(
        transferId,
        state,
        error instanceof Error ? error.message : 'Credit application failed'
      )
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
    if (!state) return

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
    if (!state) return

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
   * @param state - Current state of the saga.
   * @param reason - Description of the failure.
   */
  private async compensateWithRefund(
    transferId: string,
    state: SagaState,
    reason: string
  ): Promise<void> {
    this.sagaStates.set(transferId, { ...state, status: 'failed' })

    try {
      // Refund the debited amount
      const fromAccount = await this.repository.findById(state.fromAccountId)
      if (fromAccount) {
        fromAccount.deposit(state.amountCents)
        await this.repository.save(fromAccount)
        fromAccount.pullDomainEvents() // Clear refund events to prevent infinite loops
      }
    } catch {
      // Refund failed, must be handled manually or logged to DLQ
    }

    const failedEvent = new TransferFailed(state.fromAccountId, {
      transferId,
      fromAccountId: state.fromAccountId,
      toAccountId: state.toAccountId,
      amountCents: state.amountCents,
      reason,
    })

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
