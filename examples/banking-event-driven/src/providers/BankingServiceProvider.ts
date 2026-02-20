import { type Container, type PlanetCore, ServiceProvider } from '@gravito/core'
import { DepositMoneyCommandHandler } from '../application/commands/DepositMoneyCommand'
import {
  FreezeAccountCommandHandler,
  UnfreezeAccountCommandHandler,
} from '../application/commands/FreezeAccountCommand'
import { InitiateTransferCommandHandler } from '../application/commands/InitiateTransferCommand'
import { OpenAccountCommandHandler } from '../application/commands/OpenAccountCommand'
import { WithdrawMoneyCommandHandler } from '../application/commands/WithdrawMoneyCommand'
import { GetAccountBalanceQueryHandler } from '../application/queries/GetAccountBalanceQuery'
import { GetAllAccountsQueryHandler } from '../application/queries/GetAllAccountsQuery'
import { GetTransactionHistoryQueryHandler } from '../application/queries/GetTransactionHistoryQuery'
import { TransferSaga } from '../application/sagas/TransferSaga'
import { DeadLetterListener } from '../infrastructure/listeners/DeadLetterListener'
import { UpdateReadModelListener } from '../infrastructure/listeners/UpdateReadModelListener'
import { AccountReadModel } from '../infrastructure/projections/AccountReadModel'
import { TransactionReadModel } from '../infrastructure/projections/TransactionReadModel'
import { InMemoryAccountRepository } from '../infrastructure/repositories/InMemoryAccountRepository'
import { AccountController } from '../presentation/http/controllers/AccountController'
import { TransferController } from '../presentation/http/controllers/TransferController'
import { SSEManager } from '../presentation/http/SSEManager'

export class BankingServiceProvider extends ServiceProvider {
  register(container: Container): void {
    // ========================================================================
    // 基礎設施層
    // ========================================================================
    container.singleton('AccountRepository', () => new InMemoryAccountRepository())
    container.singleton('AccountReadModel', () => new AccountReadModel())
    container.singleton('TransactionReadModel', () => new TransactionReadModel())

    // ========================================================================
    // 監聽器
    // ========================================================================
    container.singleton('UpdateReadModelListener', () => {
      const accountReadModel = container.make<AccountReadModel>('AccountReadModel')
      const transactionReadModel = container.make<TransactionReadModel>('TransactionReadModel')
      return new UpdateReadModelListener(accountReadModel, transactionReadModel)
    })

    container.singleton('DeadLetterListener', () => new DeadLetterListener())

    // ========================================================================
    // Command Handlers
    // ========================================================================
    container.singleton('OpenAccountCommandHandler', () => {
      const repository = container.make<InMemoryAccountRepository>('AccountRepository')
      return new OpenAccountCommandHandler(repository, (this.core as PlanetCore).events)
    })

    container.singleton('DepositMoneyCommandHandler', () => {
      const repository = container.make<InMemoryAccountRepository>('AccountRepository')
      return new DepositMoneyCommandHandler(repository, (this.core as PlanetCore).events)
    })

    container.singleton('WithdrawMoneyCommandHandler', () => {
      const repository = container.make<InMemoryAccountRepository>('AccountRepository')
      return new WithdrawMoneyCommandHandler(repository, (this.core as PlanetCore).events)
    })

    container.singleton('InitiateTransferCommandHandler', () => {
      const repository = container.make<InMemoryAccountRepository>('AccountRepository')
      return new InitiateTransferCommandHandler(repository, (this.core as PlanetCore).events)
    })

    container.singleton('FreezeAccountCommandHandler', () => {
      const repository = container.make<InMemoryAccountRepository>('AccountRepository')
      return new FreezeAccountCommandHandler(repository, (this.core as PlanetCore).events)
    })

    container.singleton('UnfreezeAccountCommandHandler', () => {
      const repository = container.make<InMemoryAccountRepository>('AccountRepository')
      return new UnfreezeAccountCommandHandler(repository, (this.core as PlanetCore).events)
    })

    // ========================================================================
    // Query Handlers
    // ========================================================================
    container.singleton('GetAccountBalanceQueryHandler', () => {
      const accountReadModel = container.make<AccountReadModel>('AccountReadModel')
      return new GetAccountBalanceQueryHandler(accountReadModel)
    })

    container.singleton('GetTransactionHistoryQueryHandler', () => {
      const transactionReadModel = container.make<TransactionReadModel>('TransactionReadModel')
      return new GetTransactionHistoryQueryHandler(transactionReadModel)
    })

    container.singleton('GetAllAccountsQueryHandler', () => {
      const accountReadModel = container.make<AccountReadModel>('AccountReadModel')
      return new GetAllAccountsQueryHandler(accountReadModel)
    })

    // ========================================================================
    // Sagas
    // ========================================================================
    container.singleton('TransferSaga', () => {
      const repository = container.make<InMemoryAccountRepository>('AccountRepository')
      const deadLetterListener = container.make<DeadLetterListener>('DeadLetterListener')
      return new TransferSaga(repository, (this.core as PlanetCore).events, deadLetterListener)
    })

    // ========================================================================
    // Presentation Layer
    // ========================================================================
    container.singleton('SSEManager', () => new SSEManager())

    container.singleton('AccountController', () => {
      const openAccountHandler = container.make<OpenAccountCommandHandler>(
        'OpenAccountCommandHandler'
      )
      const depositHandler = container.make<DepositMoneyCommandHandler>(
        'DepositMoneyCommandHandler'
      )
      const withdrawHandler = container.make<WithdrawMoneyCommandHandler>(
        'WithdrawMoneyCommandHandler'
      )
      const freezeHandler = container.make<FreezeAccountCommandHandler>(
        'FreezeAccountCommandHandler'
      )
      const unfreezeHandler = container.make<UnfreezeAccountCommandHandler>(
        'UnfreezeAccountCommandHandler'
      )
      const getBalanceHandler = container.make<GetAccountBalanceQueryHandler>(
        'GetAccountBalanceQueryHandler'
      )
      const getAllAccountsHandler = container.make<GetAllAccountsQueryHandler>(
        'GetAllAccountsQueryHandler'
      )
      const repository = container.make<InMemoryAccountRepository>('AccountRepository')

      return new AccountController(
        openAccountHandler,
        depositHandler,
        withdrawHandler,
        freezeHandler,
        unfreezeHandler,
        getBalanceHandler,
        getAllAccountsHandler,
        repository
      )
    })

    container.singleton('TransferController', () => {
      const initiateTransferHandler = container.make<InitiateTransferCommandHandler>(
        'InitiateTransferCommandHandler'
      )
      const getTransactionHistoryHandler = container.make<GetTransactionHistoryQueryHandler>(
        'GetTransactionHistoryQueryHandler'
      )
      const transferSaga = container.make<TransferSaga>('TransferSaga')

      return new TransferController(
        initiateTransferHandler,
        getTransactionHistoryHandler,
        transferSaga
      )
    })
  }
}
