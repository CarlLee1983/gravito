import type { DomainEvent } from '@gravito/enterprise'
import { Money } from '../Shared/Money'
import { AccountStatus } from './AccountStatus'
import { AccountCreated } from './Events/AccountCreated'
import { FundsDeposited } from './Events/FundsDeposited'
import { FundsTransferred } from './Events/FundsTransferred'
import { FundsWithdrawn } from './Events/FundsWithdrawn'

/**
 * Account Aggregate Root
 *
 * Represents a bank account entity that manages funds and enforces business rules.
 * This is the core domain model for the banking system, implementing the AggregateRoot
 * pattern from Domain-Driven Design.
 *
 * **Invariants (Business Rules):**
 * - Balance must always be non-negative
 * - Account must be in ACTIVE status to perform transactions
 * - Single transfer cannot exceed 100,000 TWD
 * - Account must have zero balance before closure
 *
 * **Event Sourcing:**
 * - All state changes are recorded as domain events
 * - Events are pulled via `pullDomainEvents()` and published to the event bus
 * - Enables complete audit trail and distributed transaction consistency
 *
 * @example
 * ```typescript
 * // Create a new account
 * const account = Account.create(
 *   'acc-123',
 *   'John Doe',
 *   'TWD'
 * )
 *
 * // Perform transactions
 * const deposit = Money.fromDollars(100, 'TWD')
 * account.deposit(deposit)
 *
 * // Query state
 * console.log(account.balance.dollars) // 100
 *
 * // Publish events to event bus
 * const events = account.pullDomainEvents()
 * for (const event of events) {
 *   await eventBus.publish(event)
 * }
 * ```
 *
 * @since 1.0.0
 */
export class Account {
  private _id: string
  private _ownerName: string
  private _balance: Money
  private _status: AccountStatus
  private _createdAt: Date
  private _updatedAt: Date
  private _domainEvents: DomainEvent[] = []

  /**
   * Constructor for Account (use {@link Account.create} to create new accounts)
   *
   * This constructor is intentionally private in practice to enforce factory method usage.
   * For reconstruction from persistence layer, direct instantiation may be used.
   *
   * @param id - Unique account identifier (UUID)
   * @param ownerName - Account owner's display name
   * @param balance - Current account balance as Money ValueObject
   * @param status - Account status (ACTIVE, FROZEN, or CLOSED)
   * @param createdAt - Account creation timestamp (default: now)
   * @param updatedAt - Last update timestamp (default: now)
   */
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

  /**
   * Factory method to create a new account
   *
   * Initializes a new account with zero balance and ACTIVE status.
   * Automatically publishes an AccountCreated domain event for event sourcing.
   *
   * @param id - Unique account identifier (should be UUID v4)
   * @param ownerName - Account owner's name
   * @param currency - Currency code (default: 'TWD' for Taiwan Dollar)
   * @returns Newly created Account instance with pending AccountCreated event
   *
   * @example
   * ```typescript
   * const account = Account.create(
   *   crypto.randomUUID(),
   *   'Alice Chen',
   *   'TWD'
   * )
   * ```
   */
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

  /**
   * Gets the account identifier
   *
   * @readonly
   * @returns Unique account ID
   */
  get id(): string {
    return this._id
  }

  /**
   * Gets the account owner's name
   *
   * @readonly
   * @returns Owner's display name
   */
  get ownerName(): string {
    return this._ownerName
  }

  /**
   * Gets the current account balance
   *
   * @readonly
   * @returns Current balance as Money ValueObject (includes currency)
   */
  get balance(): Money {
    return this._balance
  }

  /**
   * Gets the account status
   *
   * @readonly
   * @returns Account status (ACTIVE, FROZEN, or CLOSED)
   */
  get status(): AccountStatus {
    return this._status
  }

  /**
   * Gets the account creation timestamp
   *
   * @readonly
   * @returns Account creation date
   */
  get createdAt(): Date {
    return this._createdAt
  }

  /**
   * Gets the last update timestamp
   *
   * @readonly
   * @returns Date of last modification
   */
  get updatedAt(): Date {
    return this._updatedAt
  }

  /**
   * Deposits funds into the account
   *
   * **Preconditions:**
   * - Account must be in ACTIVE status
   * - Amount currency must match account balance currency
   *
   * **Side Effects:**
   * - Increases account balance
   * - Updates lastModified timestamp
   * - Publishes FundsDeposited domain event
   *
   * @param amount - Amount to deposit as Money ValueObject
   * @throws Error if account is not active
   *
   * @example
   * ```typescript
   * const amount = Money.fromDollars(500, 'TWD')
   * account.deposit(amount)
   * // Balance increased, event queued for publication
   * ```
   */
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

  /**
   * Withdraws funds from the account
   *
   * **Preconditions:**
   * - Account must be in ACTIVE status
   * - Current balance must be sufficient to cover withdrawal
   * - Amount currency must match account balance currency
   *
   * **Side Effects:**
   * - Decreases account balance
   * - Updates lastModified timestamp
   * - Publishes FundsWithdrawn domain event
   *
   * @param amount - Amount to withdraw as Money ValueObject
   * @throws Error if account is not active
   * @throws Error if insufficient funds
   *
   * @example
   * ```typescript
   * const amount = Money.fromDollars(100, 'TWD')
   * account.withdraw(amount)
   * // Balance decreased, event queued for publication
   * ```
   */
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

  /**
   * Transfers funds to another account
   *
   * **Preconditions:**
   * - Source account must be in ACTIVE status
   * - Transfer amount must not exceed 100,000 TWD limit (per business rule)
   * - Current balance must be sufficient to cover transfer
   * - Destination account ID must be valid
   *
   * **Note on Two-Phase Transfer:**
   * This method only handles the sender's side. The receiver's side
   * (receiving the transfer) must call `receiveTransfer()` separately.
   * Implementations should ensure both calls succeed atomically via
   * transaction management in the service layer or saga pattern.
   *
   * **Side Effects:**
   * - Decreases sender's balance
   * - Updates lastModified timestamp
   * - Publishes FundsTransferred domain event
   *
   * @param toAccountId - ID of the destination account
   * @param amount - Amount to transfer as Money ValueObject
   * @throws Error if account is not active
   * @throws Error if transfer exceeds 100,000 limit
   * @throws Error if insufficient funds
   *
   * @example
   * ```typescript
   * const amount = Money.fromDollars(50000, 'TWD')
   * account.transferTo('acc-456', amount)
   * // Sender's balance decreased, receiver's side handled separately
   * ```
   */
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

  /**
   * Receives a transfer from another account (receiver's side)
   *
   * **Preconditions:**
   * - Receiving account must be in ACTIVE status
   * - Amount currency must match account balance currency
   *
   * **Side Effects:**
   * - Increases receiver's balance
   * - Updates lastModified timestamp
   * - Note: Does NOT publish a domain event (sender side handles event publication)
   *
   * **Implementation Note:**
   * This method is called after the sender's `transferTo()` succeeds.
   * Both calls should be coordinated within the TransferFunds command handler
   * to ensure atomicity (both succeed or both fail together).
   *
   * @param fromAccountId - ID of the source account (for audit trail)
   * @param amount - Amount received as Money ValueObject
   * @throws Error if account is not active
   *
   * @internal This should be called only by command handlers managing transfers
   */
  receiveTransfer(_fromAccountId: string, amount: Money): void {
    this.assertAccountIsActive()
    this._balance = this._balance.add(amount)
    this._updatedAt = new Date()
  }

  /**
   * Freezes the account (prevents all transactions)
   *
   * **Side Effects:**
   * - Changes status to FROZEN
   * - Updates lastModified timestamp
   * - Does NOT publish domain event (can be added if audit is needed)
   *
   * **Use Case:**
   * - Fraud detection system freezes suspicious accounts
   * - Manual admin action to prevent transactions during investigation
   *
   * @see {@link unfreeze}
   */
  freeze(): void {
    this._status = AccountStatus.FROZEN
    this._updatedAt = new Date()
  }

  /**
   * Unfreezes the account (resumes normal operation)
   *
   * **Side Effects:**
   * - Changes status back to ACTIVE
   * - Updates lastModified timestamp
   * - Does NOT publish domain event (can be added if audit is needed)
   *
   * @see {@link freeze}
   */
  unfreeze(): void {
    this._status = AccountStatus.ACTIVE
    this._updatedAt = new Date()
  }

  /**
   * Closes the account permanently
   *
   * **Preconditions:**
   * - Account balance must be exactly zero (all funds withdrawn)
   * - No pending transactions
   *
   * **Side Effects:**
   * - Changes status to CLOSED
   * - Updates lastModified timestamp
   * - Prevents any future transactions (due to status check)
   *
   * @throws Error if balance is not zero
   */
  close(): void {
    if (this._balance.cents > 0) {
      throw new Error('帳戶關閉前必須提取全部金額')
    }
    this._status = AccountStatus.CLOSED
    this._updatedAt = new Date()
  }

  /**
   * Pulls all pending domain events and clears the event queue
   *
   * This method is called by the persistence layer (CommandHandler)
   * to retrieve all events that occurred during this aggregate's operation.
   * Events are then published to the event bus for other satellites to consume.
   *
   * **Event Sourcing Pattern:**
   * - Events are accumulated during aggregate operations
   * - Pulled immediately after save/transaction commit
   * - Published asynchronously to event subscribers
   * - Enables eventual consistency and cross-satellite communication
   *
   * @returns Array of domain events that occurred during this aggregate's lifetime
   * @see {@link FundsDeposited}, {@link FundsWithdrawn}, {@link FundsTransferred}
   *
   * @example
   * ```typescript
   * account.deposit(amount)
   * const events = account.pullDomainEvents()
   * for (const event of events) {
   *   await eventBus.publish(event)
   * }
   * ```
   */
  pullDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents]
    this._domainEvents = []
    return events
  }

  /**
   * Validates that the account is in ACTIVE status
   *
   * This assertion is checked before any transaction (deposit, withdraw, transfer).
   * Frozen or closed accounts cannot perform transactions.
   *
   * @private
   * @throws Error if account status is not ACTIVE
   * @internal Used internally for business rule validation
   */
  private assertAccountIsActive(): void {
    if (this._status !== AccountStatus.ACTIVE) {
      throw new Error(`帳戶狀態不可進行此操作: ${this._status}`)
    }
  }

  /**
   * Validates that a transfer amount does not exceed the business limit
   *
   * **Business Rule:** Single transfer cannot exceed 100,000 TWD
   * This is an example of domain-level constraint that enforces business policy.
   *
   * @private
   * @param amount - Amount to validate
   * @throws Error if amount exceeds 100,000 limit
   * @internal Used internally for business rule validation
   */
  private assertTransferLimit(amount: Money): void {
    const limit = Money.fromDollars(100_000, amount.currency)
    if (amount.isGreaterThan(limit)) {
      throw new Error(`單次轉帳不能超過 ${limit.toString()}`)
    }
  }
}
