import type { GravitoContext } from '@gravito/core'
import {
  DepositMoneyCommand,
  type DepositMoneyCommandHandler,
  FreezeAccountCommand,
  type FreezeAccountCommandHandler,
  OpenAccountCommand,
  type OpenAccountCommandHandler,
  UnfreezeAccountCommand,
  type UnfreezeAccountCommandHandler,
  WithdrawMoneyCommand,
  type WithdrawMoneyCommandHandler,
} from '#application/commands'
import {
  GetAccountBalanceQuery,
  type GetAccountBalanceQueryHandler,
  GetAllAccountsQuery,
  type GetAllAccountsQueryHandler,
} from '#application/queries'
import type { IAccountRepository } from '#infrastructure/repositories/IAccountRepository'
import { NotFoundError } from '#presentation/http/errors'
import {
  AccountParamRequest,
  DepositMoneyRequest,
  FreezeAccountRequest,
  GetAllAccountsRequest,
  OpenAccountRequest,
  WithdrawMoneyRequest,
} from '#presentation/http/requests'
import { BaseController } from './BaseController'

/**
 * Controller handling HTTP requests related to bank accounts.
 * Manages account lifecycle and basic operations through commands and queries.
 */
export class AccountController extends BaseController {
  constructor(
    private readonly openAccountHandler: OpenAccountCommandHandler,
    private readonly depositHandler: DepositMoneyCommandHandler,
    private readonly withdrawHandler: WithdrawMoneyCommandHandler,
    private readonly freezeHandler: FreezeAccountCommandHandler,
    private readonly unfreezeHandler: UnfreezeAccountCommandHandler,
    private readonly getBalanceHandler: GetAccountBalanceQueryHandler,
    private readonly getAllAccountsHandler: GetAllAccountsQueryHandler,
    private readonly repository: IAccountRepository
  ) {
    super()
  }

  /**
   * Endpoint to open a new account.
   * POST /api/accounts
   */
  async openAccount(c: GravitoContext): Promise<Response> {
    try {
      const data = await this.validate(c, OpenAccountRequest)
      const accountId = crypto.randomUUID()
      await this.openAccountHandler.handle(
        new OpenAccountCommand(
          accountId,
          data.ownerId,
          data.ownerName,
          data.currency,
          data.initialDepositCents
        )
      )

      return c.json({ success: true, data: { accountId } }, 201)
    } catch (error) {
      return this.handleError(c, error)
    }
  }

  /**
   * Endpoint to retrieve details of a specific account.
   * GET /api/accounts/:id
   */
  async getAccount(c: GravitoContext): Promise<Response> {
    try {
      const data = await this.validate(c, AccountParamRequest)
      const account = await this.repository.findById(data.id)
      if (!account) {
        throw new NotFoundError('Account not found')
      }

      return c.json({
        success: true,
        data: {
          id: account.id,
          ownerId: account.ownerId,
          ownerName: account.ownerName,
          balanceCents: account.balance.cents,
          status: account.status,
          currency: account.currency,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
        },
      })
    } catch (error) {
      return this.handleError(c, error)
    }
  }

  /**
   * Endpoint to list all accounts with pagination support.
   * GET /api/accounts
   */
  async getAllAccounts(c: GravitoContext): Promise<Response> {
    try {
      const data = await this.validate(c, GetAllAccountsRequest)
      const result = await this.getAllAccountsHandler.handle(
        new GetAllAccountsQuery(data.limit, data.offset)
      )
      return c.json({ success: true, ...result })
    } catch (error) {
      return this.handleError(c, error)
    }
  }

  /**
   * Endpoint to check the balance of a specific account.
   * GET /api/accounts/:id/balance
   */
  async getBalance(c: GravitoContext): Promise<Response> {
    try {
      const data = await this.validate(c, AccountParamRequest)
      const record = await this.getBalanceHandler.handle(new GetAccountBalanceQuery(data.id))
      if (!record) {
        throw new NotFoundError('Account not found')
      }

      return c.json({ success: true, data: record })
    } catch (error) {
      return this.handleError(c, error)
    }
  }

  /**
   * Endpoint to deposit funds into an account.
   * POST /api/accounts/:id/deposit
   */
  async depositMoney(c: GravitoContext): Promise<Response> {
    try {
      const id = c.req.param('id') as string
      const data = await this.validate(c, DepositMoneyRequest)

      await this.depositHandler.handle(new DepositMoneyCommand(id, data.amountCents))
      return c.json({ success: true, message: 'Deposit successful' })
    } catch (error) {
      return this.handleError(c, error)
    }
  }

  /**
   * Endpoint to withdraw funds from an account.
   * POST /api/accounts/:id/withdraw
   */
  async withdrawMoney(c: GravitoContext): Promise<Response> {
    try {
      const id = c.req.param('id') as string
      const data = await this.validate(c, WithdrawMoneyRequest)

      await this.withdrawHandler.handle(new WithdrawMoneyCommand(id, data.amountCents))
      return c.json({ success: true, message: 'Withdrawal successful' })
    } catch (error) {
      return this.handleError(c, error)
    }
  }

  /**
   * Endpoint to freeze a bank account.
   * POST /api/accounts/:id/freeze
   */
  async freezeAccount(c: GravitoContext): Promise<Response> {
    try {
      const id = c.req.param('id') as string
      const data = await this.validate(c, FreezeAccountRequest)

      await this.freezeHandler.handle(new FreezeAccountCommand(id, data.reason))
      return c.json({ success: true, message: 'Account frozen' })
    } catch (error) {
      return this.handleError(c, error)
    }
  }

  /**
   * Endpoint to unfreeze a previously frozen account.
   * POST /api/accounts/:id/unfreeze
   */
  async unfreezeAccount(c: GravitoContext): Promise<Response> {
    try {
      const data = await this.validate(c, AccountParamRequest)

      await this.unfreezeHandler.handle(new UnfreezeAccountCommand(data.id))
      return c.json({ success: true, message: 'Account unfrozen' })
    } catch (error) {
      return this.handleError(c, error)
    }
  }
}
