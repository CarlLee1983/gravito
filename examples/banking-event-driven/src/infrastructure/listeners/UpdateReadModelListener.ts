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

export class UpdateReadModelListener {
  constructor(
    private readonly accountReadModel: AccountReadModel,
    private readonly transactionReadModel: TransactionReadModel
  ) {}

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

  handleAccountFrozen(event: AccountFrozen): void {
    this.accountReadModel.updateStatus(event.aggregateId, 'frozen')
  }

  handleAccountUnfrozen(event: AccountUnfrozen): void {
    this.accountReadModel.updateStatus(event.aggregateId, 'active')
  }

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
