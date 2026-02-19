import type { Container, PlanetCore } from '@gravito/core'
import { ServiceProvider } from '@gravito/core'
import { CommandBus } from '../Application/Bus/CommandBus'
import { QueryBus } from '../Application/Bus/QueryBus'
import { QueryCache } from '../Application/Cache/QueryCache'
import { CreateAccountHandler } from '../Application/Commands/CreateAccount/CreateAccountHandler'
import { DepositFundsHandler } from '../Application/Commands/DepositFunds/DepositFundsHandler'
import { TransferFundsHandler } from '../Application/Commands/TransferFunds/TransferFundsHandler'
import { WithdrawFundsHandler } from '../Application/Commands/WithdrawFunds/WithdrawFundsHandler'
import { GetAccountBalanceHandler } from '../Application/Queries/GetAccountBalance/GetAccountBalanceHandler'
import { GetAccountDetailsHandler } from '../Application/Queries/GetAccountDetails/GetAccountDetailsHandler'
import { GetTransactionHistoryHandler } from '../Application/Queries/GetTransactionHistory/GetTransactionHistoryHandler'
import { ValidationError } from '../Application/Validation/ValidationError'
import { ValidatorRegistry } from '../Application/Validation/ValidatorRegistry'
import { CreateAccountCommandValidator } from '../Application/Validation/Validators/CreateAccountCommandValidator'
import { DepositFundsCommandValidator } from '../Application/Validation/Validators/DepositFundsCommandValidator'
import { TransferFundsCommandValidator } from '../Application/Validation/Validators/TransferFundsCommandValidator'
import { WithdrawFundsCommandValidator } from '../Application/Validation/Validators/WithdrawFundsCommandValidator'
import { AtlasAccountRepository } from '../Infrastructure/Persistence/AtlasAccountRepository'
import { AtlasTransactionRepository } from '../Infrastructure/Persistence/AtlasTransactionRepository'

// 確保 ValidationError 可被 instanceof 正確識別（重新匯出供外部使用）
export { ValidationError }

/**
 * CQRS Service Provider
 *
 * Registers all core CQRS components (buses, handlers, repositories,
 * validators, cache) into the Gravito dependency injection container.
 *
 * **已整合的新功能：**
 * - ValidatorRegistry：CommandBus 在 dispatch 前自動驗證輸入
 * - QueryCache（30 秒 TTL）：QueryBus 自動快取查詢結果
 *
 * @since 1.0.0
 */
export class CqrsProvider extends ServiceProvider {
  /**
   * Registers services into the container
   *
   * @param container - The IoC container
   */
  register(container: Container): void {
    // 儲存庫（單例）
    container.singleton('banking.repository.account', () => new AtlasAccountRepository())
    container.singleton('banking.repository.transaction', () => new AtlasTransactionRepository())

    // Command Handlers
    container.bind(
      'cqrs.command.CreateAccountCommand',
      (c) => new CreateAccountHandler(c.make('banking.repository.account'), this.core as PlanetCore)
    )

    container.bind(
      'cqrs.command.DepositFundsCommand',
      (c) =>
        new DepositFundsHandler(
          c.make('banking.repository.account'),
          c.make('banking.repository.transaction'),
          this.core as PlanetCore
        )
    )

    container.bind(
      'cqrs.command.WithdrawFundsCommand',
      (c) =>
        new WithdrawFundsHandler(
          c.make('banking.repository.account'),
          c.make('banking.repository.transaction'),
          this.core as PlanetCore
        )
    )

    container.bind(
      'cqrs.command.TransferFundsCommand',
      (c) =>
        new TransferFundsHandler(
          c.make('banking.repository.account'),
          c.make('banking.repository.transaction'),
          this.core as PlanetCore
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

    // 驗證器註冊表：為每個 Command 配置對應的輸入驗證器
    const validatorRegistry = new ValidatorRegistry()
    validatorRegistry.register('CreateAccountCommand', new CreateAccountCommandValidator())
    validatorRegistry.register('DepositFundsCommand', new DepositFundsCommandValidator())
    validatorRegistry.register('WithdrawFundsCommand', new WithdrawFundsCommandValidator())
    validatorRegistry.register('TransferFundsCommand', new TransferFundsCommandValidator())

    // 查詢快取：30 秒 TTL，降低重複查詢對資料庫的負擔
    const queryCache = new QueryCache(30_000)

    // Buses（注入驗證器與快取）
    container.singleton('cqrs.commandBus', (c) => new CommandBus(c, validatorRegistry))
    container.singleton('cqrs.queryBus', (c) => new QueryBus(c, queryCache))
  }
}
