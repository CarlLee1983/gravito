import type { Database } from '@gravito/atlas'
import type { Container } from '@gravito/core'
import { ServiceProvider } from '@gravito/core'
import { CommandBus } from '../Application/Bus/CommandBus'
import { QueryBus } from '../Application/Bus/QueryBus'
import { CreateAccountHandler } from '../Application/Commands/CreateAccount/CreateAccountHandler'
import { DepositFundsHandler } from '../Application/Commands/DepositFunds/DepositFundsHandler'
import { TransferFundsHandler } from '../Application/Commands/TransferFunds/TransferFundsHandler'
import { WithdrawFundsHandler } from '../Application/Commands/WithdrawFunds/WithdrawFundsHandler'
import { GetAccountBalanceHandler } from '../Application/Queries/GetAccountBalance/GetAccountBalanceHandler'
import { GetAccountDetailsHandler } from '../Application/Queries/GetAccountDetails/GetAccountDetailsHandler'
import { GetTransactionHistoryHandler } from '../Application/Queries/GetTransactionHistory/GetTransactionHistoryHandler'
import { AtlasAccountRepository } from '../Infrastructure/Persistence/AtlasAccountRepository'
import { AtlasTransactionRepository } from '../Infrastructure/Persistence/AtlasTransactionRepository'

export class CqrsProvider extends ServiceProvider {
  register(container: Container): void {
    const db = container.make<Database>('db')

    // 儲存庫（單例）
    container.singleton('banking.repository.account', () => new AtlasAccountRepository(db))
    container.singleton('banking.repository.transaction', () => new AtlasTransactionRepository(db))

    // Command Handlers
    container.bind(
      'cqrs.command.CreateAccountCommand',
      (c) => new CreateAccountHandler(c.make('banking.repository.account'), this.core!)
    )

    container.bind(
      'cqrs.command.DepositFundsCommand',
      (c) =>
        new DepositFundsHandler(
          c.make('banking.repository.account'),
          c.make('banking.repository.transaction'),
          this.core!
        )
    )

    container.bind(
      'cqrs.command.WithdrawFundsCommand',
      (c) =>
        new WithdrawFundsHandler(
          c.make('banking.repository.account'),
          c.make('banking.repository.transaction'),
          this.core!
        )
    )

    container.bind(
      'cqrs.command.TransferFundsCommand',
      (c) =>
        new TransferFundsHandler(
          c.make('banking.repository.account'),
          c.make('banking.repository.transaction'),
          this.core!
        )
    )

    // Query Handlers
    container.bind(
      'cqrs.query.GetAccountBalanceQuery',
      (c) => new GetAccountBalanceHandler(c.make('banking.repository.account'))
    )

    container.bind(
      'cqrs.query.GetAccountDetailsQuery',
      (c) => new GetAccountDetailsHandler(c.make('banking.repository.account'))
    )

    container.bind(
      'cqrs.query.GetTransactionHistoryQuery',
      (c) => new GetTransactionHistoryHandler(c.make('banking.repository.transaction'))
    )

    // Buses（透過 Container 解析）
    container.singleton('cqrs.commandBus', (c) => new CommandBus(c))
    container.singleton('cqrs.queryBus', (c) => new QueryBus(c))
  }
}
