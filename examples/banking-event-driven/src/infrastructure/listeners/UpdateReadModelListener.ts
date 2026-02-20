import type { AccountFrozen } from '../../domain/account/events/AccountFrozen'
import type { AccountOpened } from '../../domain/account/events/AccountOpened'
import type { AccountUnfrozen } from '../../domain/account/events/AccountUnfrozen'
import type { MoneyDeposited } from '../../domain/account/events/MoneyDeposited'
import type { MoneyWithdrawn } from '../../domain/account/events/MoneyWithdrawn'
import type { TransferCompleted } from '../../domain/account/events/TransferCompleted'
import type { TransferCreditApplied } from '../../domain/account/events/TransferCreditApplied'
import type { TransferDebitApplied } from '../../domain/account/events/TransferDebitApplied'
import type { TransferFailed } from '../../domain/account/events/TransferFailed'
import type { AccountReadModel } from '../projections/AccountReadModel'
import type { TransactionReadModel } from '../projections/TransactionReadModel'

/**
 * Listener responsible for keeping read models synchronized with domain events.
 * This implements the "Projection" part of the CQRS pattern.
 */
export class UpdateReadModelListener {
  constructor(
    private readonly accountReadModel: AccountReadModel,
    private readonly transactionReadModel: TransactionReadModel
  ) {}

  /**
   * Projections when a new account is opened.
   */
  handleAccountOpened(event: AccountOpened): void {
    this.accountReadModel.addAccount({
      id: event.aggregateId,
      ownerName: event.payload.ownerName,
      balanceCents: event.payload.initialBalanceCents,
      status: 'active',
      currency: event.payload.currency,
      createdAt: event.timestamp,
    })
  }

  /**
   * Updates read model when money is deposited.
   */
  handleMoneyDeposited(event: MoneyDeposited): void {
    this.accountReadModel.updateBalance(event.aggregateId, event.payload.newBalanceCents)
    this.transactionReadModel.addTransaction({
      id: event.eventId,
      accountId: event.aggregateId,
      type: 'deposit',
      amountCents: event.payload.amountCents,
      timestamp: event.timestamp,
    })
  }

  /**
   * Updates read model when money is withdrawn.
   */
  handleMoneyWithdrawn(event: MoneyWithdrawn): void {
    this.accountReadModel.updateBalance(event.aggregateId, event.payload.newBalanceCents)
    this.transactionReadModel.addTransaction({
      id: event.eventId,
      accountId: event.aggregateId,
      type: 'withdrawal',
      amountCents: event.payload.amountCents,
      timestamp: event.timestamp,
    })
  }

  /**
   * Updates read model status to frozen.
   */
  handleAccountFrozen(event: AccountFrozen): void {
    this.accountReadModel.updateStatus(event.aggregateId, 'frozen')
  }

  /**
   * Updates read model status to active.
   */
  handleAccountUnfrozen(event: AccountUnfrozen): void {
    this.accountReadModel.updateStatus(event.aggregateId, 'active')
  }

  /**
   * Records a transfer debit in the transaction history and updates balance.
   */
  handleTransferDebitApplied(event: TransferDebitApplied): void {
    this.accountReadModel.updateBalance(event.aggregateId, event.payload.newBalanceCents)
    this.transactionReadModel.addTransaction({
      id: event.eventId,
      accountId: event.aggregateId,
      type: 'transfer_debit',
      amountCents: event.payload.amountCents,
      timestamp: event.timestamp,
      transferId: event.payload.transferId,
    })
  }

  /**
   * Records a transfer credit in the transaction history and updates balance.
   */
  handleTransferCreditApplied(event: TransferCreditApplied): void {
    this.accountReadModel.updateBalance(event.aggregateId, event.payload.newBalanceCents)
    this.transactionReadModel.addTransaction({
      id: event.eventId,
      accountId: event.aggregateId,
      type: 'transfer_credit',
      amountCents: event.payload.amountCents,
      timestamp: event.timestamp,
      transferId: event.payload.transferId,
    })
  }

  /**
   * Records transfer completion event in the transaction history.
   */
  handleTransferCompleted(event: TransferCompleted): void {
    this.transactionReadModel.addTransaction({
      id: event.eventId,
      accountId: event.aggregateId,
      type: 'transfer_completed',
      amountCents: event.payload.amountCents,
      timestamp: event.timestamp,
      transferId: event.payload.transferId,
    })
  }

  /**
   * Records transfer failure event in the transaction history.
   */
  handleTransferFailed(event: TransferFailed): void {
    this.transactionReadModel.addTransaction({
      id: event.eventId,
      accountId: event.aggregateId,
      type: 'transfer_failed',
      amountCents: event.payload.amountCents,
      timestamp: event.timestamp,
      transferId: event.payload.transferId,
    })
  }
}
