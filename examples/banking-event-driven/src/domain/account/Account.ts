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

/**
 * Represents the current status of an account.
 */
export type AccountStatus = 'active' | 'frozen'

/**
 * Account - Core Aggregate Root for the banking domain.
 * Manages balance, status, and transaction-related domain events.
 *
 * Implements Optimistic Concurrency Control (OCC) using a version field
 * to detect and prevent concurrent modification conflicts.
 */
export class Account extends AggregateRoot<string> {
  private _ownerId: string
  private _ownerName: string
  private _balance: Money
  private _status: AccountStatus
  private _currency: string
  private _version: number
  private _createdAt: Date
  private _updatedAt: Date

  private constructor(
    id: string,
    ownerId: string,
    ownerName: string,
    balance: Money,
    status: AccountStatus,
    currency: string,
    version: number,
    createdAt: Date,
    updatedAt: Date
  ) {
    super(id)
    this._ownerId = ownerId
    this._ownerName = ownerName
    this._balance = balance
    this._status = status
    this._currency = currency
    this._version = version
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
  get version(): number {
    return this._version
  }
  get createdAt(): Date {
    return this._createdAt
  }
  get updatedAt(): Date {
    return this._updatedAt
  }

  /**
   * Factory method to open a new account.
   *
   * @param id - The unique identifier for the account.
   * @param ownerId - The owner's unique identifier.
   * @param ownerName - The owner's display name.
   * @param currency - The account's currency.
   * @param initialDepositCents - Initial deposit amount in cents.
   * @returns A new Account instance.
   */
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
      1, // Initialize version to 1
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

  /**
   * Deposits money into the account.
   *
   * @param amountCents - Amount to deposit in cents.
   * @throws {Error} If the account is frozen.
   */
  deposit(amountCents: number): void {
    this.assertActive()
    this._balance = this._balance.add(Money.of(amountCents))
    this._updatedAt = new Date()
    this._version++

    this.addDomainEvent(
      new MoneyDeposited(this.id, {
        amountCents,
        newBalanceCents: this._balance.cents,
      })
    )
  }

  /**
   * Withdraws money from the account.
   *
   * @param amountCents - Amount to withdraw in cents.
   * @throws {Error} If account is frozen or has insufficient balance.
   */
  withdraw(amountCents: number): void {
    this.assertActive()
    const amount = Money.of(amountCents)
    if (!this._balance.isGreaterThanOrEqual(amount)) {
      throw new Error(
        `Insufficient funds: Current balance ${this._balance.cents}, needed ${amountCents}`
      )
    }
    this._balance = this._balance.subtract(amount)
    this._updatedAt = new Date()
    this._version++

    this.addDomainEvent(
      new MoneyWithdrawn(this.id, {
        amountCents,
        newBalanceCents: this._balance.cents,
      })
    )
  }

  /**
   * Applies a debit for a fund transfer.
   *
   * @param amountCents - Amount to debit in cents.
   * @param transferId - The ID of the transfer transaction.
   * @throws {Error} If account is frozen or has insufficient balance for transfer.
   */
  applyTransferDebit(amountCents: number, transferId: string): void {
    this.assertActive()
    const amount = Money.of(amountCents)
    if (!this._balance.isGreaterThanOrEqual(amount)) {
      throw new Error(
        `Insufficient funds for transfer: Current balance ${this._balance.cents}, needed ${amountCents}`
      )
    }
    this._balance = this._balance.subtract(amount)
    this._updatedAt = new Date()
    this._version++

    this.addDomainEvent(
      new TransferDebitApplied(this.id, {
        transferId,
        amountCents,
        newBalanceCents: this._balance.cents,
      })
    )
  }

  /**
   * Applies a credit for an incoming fund transfer.
   *
   * @param amountCents - Amount to credit in cents.
   * @param transferId - The ID of the transfer transaction.
   * @throws {Error} If the account is frozen.
   */
  applyTransferCredit(amountCents: number, transferId: string): void {
    this.assertActive()
    this._balance = this._balance.add(Money.of(amountCents))
    this._updatedAt = new Date()
    this._version++

    this.addDomainEvent(
      new TransferCreditApplied(this.id, {
        transferId,
        amountCents,
        newBalanceCents: this._balance.cents,
      })
    )
  }

  /**
   * Initiates a fund transfer request.
   *
   * @param transferId - Unique identifier for the transfer.
   * @param toAccountId - The recipient account ID.
   * @param amountCents - Amount to transfer in cents.
   * @throws {Error} If the account is frozen.
   */
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

  /**
   * Freezes the account to prevent further transactions.
   *
   * @param reason - Optional explanation for freezing the account.
   * @throws {Error} If the account is already frozen.
   */
  freeze(reason?: string): void {
    if (this._status === 'frozen') {
      throw new Error('Account is already frozen')
    }
    this._status = 'frozen'
    this._updatedAt = new Date()
    this._version++

    this.addDomainEvent(new AccountFrozen(this.id, { reason }))
  }

  /**
   * Unfreezes the account to allow transactions again.
   *
   * @throws {Error} If the account is already active.
   */
  unfreeze(): void {
    if (this._status === 'active') {
      throw new Error('Account is already active')
    }
    this._status = 'active'
    this._updatedAt = new Date()
    this._version++

    this.addDomainEvent(new AccountUnfrozen(this.id, {}))
  }

  /**
   * Asserts that the account is active.
   *
   * @throws {Error} If the account status is not active.
   */
  private assertActive(): void {
    if (this._status !== 'active') {
      throw new Error(`Account is frozen, operation not allowed`)
    }
  }
}
