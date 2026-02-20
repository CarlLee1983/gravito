import type { GravitoContext } from '@gravito/core'
import type { DepositMoneyCommandHandler } from '../../../application/commands/DepositMoneyCommand'
import { DepositMoneyCommand } from '../../../application/commands/DepositMoneyCommand'
import type {
  FreezeAccountCommandHandler,
  UnfreezeAccountCommandHandler,
} from '../../../application/commands/FreezeAccountCommand'
import {
  FreezeAccountCommand,
  UnfreezeAccountCommand,
} from '../../../application/commands/FreezeAccountCommand'
import type { OpenAccountCommandHandler } from '../../../application/commands/OpenAccountCommand'
import { OpenAccountCommand } from '../../../application/commands/OpenAccountCommand'
import type { WithdrawMoneyCommandHandler } from '../../../application/commands/WithdrawMoneyCommand'
import { WithdrawMoneyCommand } from '../../../application/commands/WithdrawMoneyCommand'
import type { GetAccountBalanceQueryHandler } from '../../../application/queries/GetAccountBalanceQuery'
import { GetAccountBalanceQuery } from '../../../application/queries/GetAccountBalanceQuery'
import type { GetAllAccountsQueryHandler } from '../../../application/queries/GetAllAccountsQuery'
import { GetAllAccountsQuery } from '../../../application/queries/GetAllAccountsQuery'
import type { IAccountRepository } from '../../../infrastructure/repositories/IAccountRepository'
import { AccountParamRequest } from '../requests/AccountParamRequest'
import { DepositMoneyRequest } from '../requests/DepositMoneyRequest'
import { FreezeAccountRequest } from '../requests/FreezeAccountRequest'
import { GetAllAccountsRequest } from '../requests/GetAllAccountsRequest'
import { OpenAccountRequest } from '../requests/OpenAccountRequest'
import { WithdrawMoneyRequest } from '../requests/WithdrawMoneyRequest'
import { BaseController } from './BaseController'

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
      return c.json(
        { success: false, error: error instanceof Error ? error.message : '未知錯誤' },
        400
      )
    }
  }

  async getAccount(c: GravitoContext): Promise<Response> {
    try {
      const data = await this.validate(c, AccountParamRequest)
      const account = await this.repository.findById(data.id)
      if (!account) {
        return c.json({ success: false, error: '帳戶不存在' }, 404)
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
      return c.json(
        { success: false, error: error instanceof Error ? error.message : '未知錯誤' },
        500
      )
    }
  }

  async getAllAccounts(c: GravitoContext): Promise<Response> {
    try {
      const data = await this.validate(c, GetAllAccountsRequest)
      const result = await this.getAllAccountsHandler.handle(
        new GetAllAccountsQuery(data.limit, data.offset)
      )
      return c.json({ success: true, ...result })
    } catch (error) {
      return c.json(
        { success: false, error: error instanceof Error ? error.message : '未知錯誤' },
        500
      )
    }
  }

  async getBalance(c: GravitoContext): Promise<Response> {
    try {
      const data = await this.validate(c, AccountParamRequest)
      const record = await this.getBalanceHandler.handle(new GetAccountBalanceQuery(data.id))
      if (!record) {
        return c.json({ success: false, error: '帳戶不存在' }, 404)
      }

      return c.json({ success: true, data: record })
    } catch (error) {
      return c.json(
        { success: false, error: error instanceof Error ? error.message : '未知錯誤' },
        500
      )
    }
  }

  async depositMoney(c: GravitoContext): Promise<Response> {
    try {
      const id = c.req.param('id') as string
      const data = await this.validate(c, DepositMoneyRequest)

      await this.depositHandler.handle(new DepositMoneyCommand(id, data.amountCents))
      return c.json({ success: true, message: '入款成功' })
    } catch (error) {
      return c.json(
        { success: false, error: error instanceof Error ? error.message : '未知錯誤' },
        400
      )
    }
  }

  async withdrawMoney(c: GravitoContext): Promise<Response> {
    try {
      const id = c.req.param('id') as string
      const data = await this.validate(c, WithdrawMoneyRequest)

      await this.withdrawHandler.handle(new WithdrawMoneyCommand(id, data.amountCents))
      return c.json({ success: true, message: '出款成功' })
    } catch (error) {
      return c.json(
        { success: false, error: error instanceof Error ? error.message : '未知錯誤' },
        400
      )
    }
  }

  async freezeAccount(c: GravitoContext): Promise<Response> {
    try {
      const id = c.req.param('id') as string
      const data = await this.validate(c, FreezeAccountRequest)

      await this.freezeHandler.handle(new FreezeAccountCommand(id, data.reason))
      return c.json({ success: true, message: '帳戶已凍結' })
    } catch (error) {
      return c.json(
        { success: false, error: error instanceof Error ? error.message : '未知錯誤' },
        400
      )
    }
  }

  async unfreezeAccount(c: GravitoContext): Promise<Response> {
    try {
      const data = await this.validate(c, AccountParamRequest)

      await this.unfreezeHandler.handle(new UnfreezeAccountCommand(data.id))
      return c.json({ success: true, message: '帳戶已解凍' })
    } catch (error) {
      return c.json(
        { success: false, error: error instanceof Error ? error.message : '未知錯誤' },
        400
      )
    }
  }
}
