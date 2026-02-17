import { AggregateRoot } from '@gravito/enterprise'
import { Money } from '../shared/Money'
import { AccountFrozen } from './events/AccountFrozen'
import { AccountOpened } from './events/AccountOpened'
import { AccountUnfrozen } from './events/AccountUnfrozen'
import { MoneyDeposited } from './events/MoneyDeposited'
import { MoneyWithdrawn } from './events/MoneyWithdrawn'
import { TransferCreditApplied } from './events/TransferCreditApplied'
import { TransferDebitApplied } from './events/TransferDebitApplied'
import { TransferInitiated } from './events/TransferInitiated'

export type AccountStatus = 'active' | 'frozen'

export class Account extends AggregateRoot<string> {
  private _ownerId: string
  private _ownerName: string
  private _balance: Money
  private _status: AccountStatus
  private _currency: string
  private _createdAt: Date
  private _updatedAt: Date

  private constructor(
    id: string,
    ownerId: string,
    ownerName: string,
    balance: Money,
    status: AccountStatus,
    currency: string,
    createdAt: Date,
    updatedAt: Date
  ) {
    super(id)
    this._ownerId = ownerId
    this._ownerName = ownerName
    this._balance = balance
    this._status = status
    this._currency = currency
    this._createdAt = createdAt
    this._updatedAt = updatedAt
  }

  // Getters
  get ownerId(): string {
    return this._ownerId
  }
  get ownerName(): string {
    return this._ownerName
  }
  get balance(): Money {
    return this._balance
  }
  get status(): AccountStatus {
    return this._status
  }
  get currency(): string {
    return this._currency
  }
  get createdAt(): Date {
    return this._createdAt
  }
  get updatedAt(): Date {
    return this._updatedAt
  }

  static open(
    id: string,
    ownerId: string,
    ownerName: string,
    currency: string,
    initialDepositCents: number
  ): Account {
    const now = new Date()
    const account = new Account(
      id,
      ownerId,
      ownerName,
      Money.of(initialDepositCents),
      'active',
      currency,
      now,
      now
    )

    account.addDomainEvent(
      new AccountOpened(id, {
        ownerId,
        ownerName,
        currency,
        initialBalanceCents: initialDepositCents,
      })
    )

    return account
  }

  deposit(amountCents: number): void {
    this.assertActive()
    this._balance = this._balance.add(Money.of(amountCents))
    this._updatedAt = new Date()

    this.addDomainEvent(
      new MoneyDeposited(this.id, {
        amountCents,
        newBalanceCents: this._balance.cents,
      })
    )
  }

  withdraw(amountCents: number): void {
    this.assertActive()
    const amount = Money.of(amountCents)
    if (!this._balance.isGreaterThanOrEqual(amount)) {
      throw new Error(`餘額不足: 現有 ${this._balance.cents} 分，需要 ${amountCents} 分`)
    }
    this._balance = this._balance.subtract(amount)
    this._updatedAt = new Date()

    this.addDomainEvent(
      new MoneyWithdrawn(this.id, {
        amountCents,
        newBalanceCents: this._balance.cents,
      })
    )
  }

  applyTransferDebit(amountCents: number, transferId: string): void {
    this.assertActive()
    const amount = Money.of(amountCents)
    if (!this._balance.isGreaterThanOrEqual(amount)) {
      throw new Error(`轉帳餘額不足: 現有 ${this._balance.cents} 分，需要 ${amountCents} 分`)
    }
    this._balance = this._balance.subtract(amount)
    this._updatedAt = new Date()

    this.addDomainEvent(
      new TransferDebitApplied(this.id, {
        transferId,
        amountCents,
        newBalanceCents: this._balance.cents,
      })
    )
  }

  applyTransferCredit(amountCents: number, transferId: string): void {
    this.assertActive()
    this._balance = this._balance.add(Money.of(amountCents))
    this._updatedAt = new Date()

    this.addDomainEvent(
      new TransferCreditApplied(this.id, {
        transferId,
        amountCents,
        newBalanceCents: this._balance.cents,
      })
    )
  }

  initiateTransfer(transferId: string, toAccountId: string, amountCents: number): void {
    this.assertActive()
    this.addDomainEvent(
      new TransferInitiated(this.id, {
        transferId,
        fromAccountId: this.id,
        toAccountId,
        amountCents,
      })
    )
  }

  freeze(reason?: string): void {
    if (this._status === 'frozen') {
      throw new Error('帳戶已凍結')
    }
    this._status = 'frozen'
    this._updatedAt = new Date()

    this.addDomainEvent(new AccountFrozen(this.id, { reason }))
  }

  unfreeze(): void {
    if (this._status === 'active') {
      throw new Error('帳戶已啟用')
    }
    this._status = 'active'
    this._updatedAt = new Date()

    this.addDomainEvent(new AccountUnfrozen(this.id, {}))
  }

  private assertActive(): void {
    if (this._status !== 'active') {
      throw new Error(`帳戶已凍結，無法執行操作`)
    }
  }
}
