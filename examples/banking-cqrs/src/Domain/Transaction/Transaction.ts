import { TransactionType } from './TransactionType'

export class Transaction {
  constructor(
    readonly id: string,
    readonly accountId: string,
    readonly type: TransactionType,
    readonly amount: number,
    readonly balanceAfter: number,
    readonly currency: string,
    readonly referenceId: string | null,
    readonly description: string | null,
    readonly createdAt: Date = new Date()
  ) {}

  static deposit(
    id: string,
    accountId: string,
    amount: number,
    balanceAfter: number,
    currency: string
  ): Transaction {
    return new Transaction(
      id,
      accountId,
      TransactionType.DEPOSIT,
      amount,
      balanceAfter,
      currency,
      null,
      '存款',
      new Date()
    )
  }

  static withdrawal(
    id: string,
    accountId: string,
    amount: number,
    balanceAfter: number,
    currency: string
  ): Transaction {
    return new Transaction(
      id,
      accountId,
      TransactionType.WITHDRAWAL,
      amount,
      balanceAfter,
      currency,
      null,
      '提款',
      new Date()
    )
  }

  static transfer(
    id: string,
    accountId: string,
    toAccountId: string,
    amount: number,
    balanceAfter: number,
    currency: string,
    isOutgoing: boolean
  ): Transaction {
    return new Transaction(
      id,
      accountId,
      isOutgoing ? TransactionType.TRANSFER_OUT : TransactionType.TRANSFER_IN,
      amount,
      balanceAfter,
      currency,
      toAccountId,
      isOutgoing ? `轉帳給 ${toAccountId}` : `轉帳自 ${toAccountId}`,
      new Date()
    )
  }
}
