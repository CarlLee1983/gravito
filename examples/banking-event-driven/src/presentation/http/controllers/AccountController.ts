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

export class AccountController {
  constructor(
    private readonly openAccountHandler: OpenAccountCommandHandler,
    private readonly depositHandler: DepositMoneyCommandHandler,
    private readonly withdrawHandler: WithdrawMoneyCommandHandler,
    private readonly freezeHandler: FreezeAccountCommandHandler,
    private readonly unfreezeHandler: UnfreezeAccountCommandHandler,
    private readonly getBalanceHandler: GetAccountBalanceQueryHandler,
    private readonly getAllAccountsHandler: GetAllAccountsQueryHandler,
    private readonly repository: IAccountRepository
  ) {}

  async openAccount(c: GravitoContext): Promise<Response> {
    try {
      const body = await c.req.json<{
        ownerId: string
        ownerName: string
        currency?: string
        initialDepositCents?: number
      }>()

      const accountId = crypto.randomUUID()
      await this.openAccountHandler.handle(
        new OpenAccountCommand(
          accountId,
          body.ownerId,
          body.ownerName,
          body.currency ?? 'TWD',
          body.initialDepositCents ?? 0
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
      const id = c.req.param('id')
      if (!id) {
        return c.json({ success: false, error: '缺少帳戶 ID' }, 400)
      }
      const account = await this.repository.findById(id)
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
      const limit = Number(c.req.query('limit') ?? '20')
      const offset = Number(c.req.query('offset') ?? '0')

      const result = await this.getAllAccountsHandler.handle(new GetAllAccountsQuery(limit, offset))
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
      const id = c.req.param('id')
      if (!id) {
        return c.json({ success: false, error: '缺少帳戶 ID' }, 400)
      }
      const record = await this.getBalanceHandler.handle(new GetAccountBalanceQuery(id))
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
      const id = c.req.param('id')
      if (!id) {
        return c.json({ success: false, error: '缺少帳戶 ID' }, 400)
      }
      const body = await c.req.json<{ amountCents: number }>()

      await this.depositHandler.handle(new DepositMoneyCommand(id, body.amountCents))
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
      const id = c.req.param('id')
      if (!id) {
        return c.json({ success: false, error: '缺少帳戶 ID' }, 400)
      }
      const body = await c.req.json<{ amountCents: number }>()

      await this.withdrawHandler.handle(new WithdrawMoneyCommand(id, body.amountCents))
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
      const id = c.req.param('id')
      if (!id) {
        return c.json({ success: false, error: '缺少帳戶 ID' }, 400)
      }
      const body = await c.req.json<{ reason?: string }>().catch(() => ({}))

      await this.freezeHandler.handle(new FreezeAccountCommand(id, (body as any).reason))
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
      const id = c.req.param('id')
      if (!id) {
        return c.json({ success: false, error: '缺少帳戶 ID' }, 400)
      }

      await this.unfreezeHandler.handle(new UnfreezeAccountCommand(id))
      return c.json({ success: true, message: '帳戶已解凍' })
    } catch (error) {
      return c.json(
        { success: false, error: error instanceof Error ? error.message : '未知錯誤' },
        400
      )
    }
  }
}
