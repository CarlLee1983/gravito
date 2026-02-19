import { randomUUID } from 'crypto'
import type { CommandBus } from '../Bus/CommandBus'
import type { QueryBus } from '../Bus/QueryBus'
import { CreateAccountCommand } from '../Commands/CreateAccount/CreateAccountCommand'
import { DepositFundsCommand } from '../Commands/DepositFunds/DepositFundsCommand'
import { TransferFundsCommand } from '../Commands/TransferFunds/TransferFundsCommand'
import { WithdrawFundsCommand } from '../Commands/WithdrawFunds/WithdrawFundsCommand'
import { GetAccountBalanceQuery } from '../Queries/GetAccountBalance/GetAccountBalanceQuery'
import { GetAccountDetailsQuery } from '../Queries/GetAccountDetails/GetAccountDetailsQuery'
import { GetTransactionHistoryQuery } from '../Queries/GetTransactionHistory/GetTransactionHistoryQuery'
import type {
  CreateAccountInput,
  DepositInput,
  TransferInput,
  WithdrawInput,
} from '../Schemas/AccountSchemas'

/**
 * 建立帳戶 Action
 *
 * 將已驗證的輸入轉換為 CreateAccountCommand 並派發至 CommandBus。
 * 回傳新建帳戶的 ID。
 *
 * @since 2.0.0
 */
export class CreateAccountAction {
  constructor(private readonly commandBus: CommandBus) {}

  async execute(input: CreateAccountInput): Promise<{ accountId: string }> {
    const accountId = randomUUID()
    const command = new CreateAccountCommand(accountId, input.ownerName, input.currency)
    await this.commandBus.dispatch(command)
    return { accountId }
  }
}

/**
 * 取得帳戶明細 Action
 *
 * 執行 GetAccountDetailsQuery，回傳完整帳戶資訊。
 *
 * @since 2.0.0
 */
export class GetAccountDetailsAction {
  constructor(private readonly queryBus: QueryBus) {}

  async execute(accountId: string): Promise<unknown> {
    const query = new GetAccountDetailsQuery(accountId)
    return this.queryBus.execute(query)
  }
}

/**
 * 取得帳戶餘額 Action
 *
 * 執行 GetAccountBalanceQuery，回傳帳戶餘額與狀態。
 *
 * @since 2.0.0
 */
export class GetAccountBalanceAction {
  constructor(private readonly queryBus: QueryBus) {}

  async execute(accountId: string): Promise<unknown> {
    const query = new GetAccountBalanceQuery(accountId)
    return this.queryBus.execute(query)
  }
}

/**
 * 存款 Action
 *
 * 將金額從元（dollars）轉換為分（cents）後派發 DepositFundsCommand。
 *
 * @since 2.0.0
 */
export class DepositFundsAction {
  constructor(private readonly commandBus: CommandBus) {}

  async execute(accountId: string, input: DepositInput): Promise<void> {
    const command = new DepositFundsCommand(
      accountId,
      Math.round(input.amount * 100),
      input.currency
    )
    await this.commandBus.dispatch(command)
  }
}

/**
 * 提款 Action
 *
 * 將金額從元（dollars）轉換為分（cents）後派發 WithdrawFundsCommand。
 *
 * @since 2.0.0
 */
export class WithdrawFundsAction {
  constructor(private readonly commandBus: CommandBus) {}

  async execute(accountId: string, input: WithdrawInput): Promise<void> {
    const command = new WithdrawFundsCommand(
      accountId,
      Math.round(input.amount * 100),
      input.currency
    )
    await this.commandBus.dispatch(command)
  }
}

/**
 * 轉帳 Action
 *
 * 將金額從元（dollars）轉換為分（cents）後派發 TransferFundsCommand。
 *
 * @since 2.0.0
 */
export class TransferFundsAction {
  constructor(private readonly commandBus: CommandBus) {}

  async execute(accountId: string, input: TransferInput): Promise<void> {
    const command = new TransferFundsCommand(
      accountId,
      input.toAccountId,
      Math.round(input.amount * 100),
      input.currency
    )
    await this.commandBus.dispatch(command)
  }
}

/**
 * 查詢交易歷史 Action
 *
 * 執行 GetTransactionHistoryQuery，回傳分頁的交易歷史。
 *
 * @since 2.0.0
 */
export class GetTransactionHistoryAction {
  constructor(private readonly queryBus: QueryBus) {}

  async execute(accountId: string, limit: number, offset: number): Promise<unknown> {
    const query = new GetTransactionHistoryQuery(accountId, limit, offset)
    return this.queryBus.execute(query)
  }
}
