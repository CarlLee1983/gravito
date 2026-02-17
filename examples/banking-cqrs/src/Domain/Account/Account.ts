import type { DomainEvent } from '@gravito/enterprise'
import { Money } from '../Shared/Money'
import { AccountStatus } from './AccountStatus'
import { AccountCreated } from './Events/AccountCreated'
import { FundsDeposited } from './Events/FundsDeposited'
import { FundsTransferred } from './Events/FundsTransferred'
import { FundsWithdrawn } from './Events/FundsWithdrawn'

export class Account {
  private _id: string
  private _ownerName: string
  private _balance: Money
  private _status: AccountStatus
  private _createdAt: Date
  private _updatedAt: Date
  private _domainEvents: DomainEvent[] = []

  constructor(
    id: string,
    ownerName: string,
    balance: Money,
    status: AccountStatus = AccountStatus.ACTIVE,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date()
  ) {
    this._id = id
    this._ownerName = ownerName
    this._balance = balance
    this._status = status
    this._createdAt = createdAt
    this._updatedAt = updatedAt
  }

  static create(id: string, ownerName: string, currency = 'TWD'): Account {
    const account = new Account(
      id,
      ownerName,
      new Money(0, currency),
      AccountStatus.ACTIVE,
      new Date(),
      new Date()
    )

    account._domainEvents.push(new AccountCreated(id, ownerName, currency, account._createdAt))

    return account
  }

  get id(): string {
    return this._id
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

  get createdAt(): Date {
    return this._createdAt
  }

  get updatedAt(): Date {
    return this._updatedAt
  }

  deposit(amount: Money): void {
    this.assertAccountIsActive()
    this._balance = this._balance.add(amount)
    this._updatedAt = new Date()

    this._domainEvents.push(
      new FundsDeposited(
        this._id,
        amount.cents,
        this._balance.cents,
        amount.currency,
        this._updatedAt
      )
    )
  }

  withdraw(amount: Money): void {
    this.assertAccountIsActive()
    if (this._balance.isLessThan(amount)) {
      throw new Error('餘額不足無法提取')
    }

    this._balance = this._balance.subtract(amount)
    this._updatedAt = new Date()

    this._domainEvents.push(
      new FundsWithdrawn(
        this._id,
        amount.cents,
        this._balance.cents,
        amount.currency,
        this._updatedAt
      )
    )
  }

  transferTo(toAccountId: string, amount: Money): void {
    this.assertAccountIsActive()
    this.assertTransferLimit(amount)
    if (this._balance.isLessThan(amount)) {
      throw new Error('餘額不足無法轉帳')
    }

    this._balance = this._balance.subtract(amount)
    this._updatedAt = new Date()

    this._domainEvents.push(
      new FundsTransferred(
        this._id,
        toAccountId,
        amount.cents,
        this._balance.cents,
        amount.currency,
        this._updatedAt
      )
    )
  }

  receiveTransfer(fromAccountId: string, amount: Money): void {
    this.assertAccountIsActive()
    this._balance = this._balance.add(amount)
    this._updatedAt = new Date()
  }

  freeze(): void {
    this._status = AccountStatus.FROZEN
    this._updatedAt = new Date()
  }

  unfreeze(): void {
    this._status = AccountStatus.ACTIVE
    this._updatedAt = new Date()
  }

  close(): void {
    if (this._balance.cents > 0) {
      throw new Error('帳戶關閉前必須提取全部金額')
    }
    this._status = AccountStatus.CLOSED
    this._updatedAt = new Date()
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents]
    this._domainEvents = []
    return events
  }

  private assertAccountIsActive(): void {
    if (this._status !== AccountStatus.ACTIVE) {
      throw new Error(`帳戶狀態不可進行此操作: ${this._status}`)
    }
  }

  private assertTransferLimit(amount: Money): void {
    const limit = Money.fromDollars(100_000, amount.currency)
    if (amount.isGreaterThan(limit)) {
      throw new Error(`單次轉帳不能超過 ${limit.toString()}`)
    }
  }
}
