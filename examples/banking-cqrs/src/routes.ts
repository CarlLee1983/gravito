import type { PlanetCore } from '@gravito/core'
import { randomUUID } from 'crypto'
import type { CommandBus } from './Application/Bus/CommandBus'
import type { QueryBus } from './Application/Bus/QueryBus'
import { CreateAccountCommand } from './Application/Commands/CreateAccount/CreateAccountCommand'
import { DepositFundsCommand } from './Application/Commands/DepositFunds/DepositFundsCommand'
import { TransferFundsCommand } from './Application/Commands/TransferFunds/TransferFundsCommand'
import { WithdrawFundsCommand } from './Application/Commands/WithdrawFunds/WithdrawFundsCommand'
import { GetAccountBalanceQuery } from './Application/Queries/GetAccountBalance/GetAccountBalanceQuery'
import { GetAccountDetailsQuery } from './Application/Queries/GetAccountDetails/GetAccountDetailsQuery'
import { GetTransactionHistoryQuery } from './Application/Queries/GetTransactionHistory/GetTransactionHistoryQuery'

export function registerRoutes(router: any): void {
  // 建立帳戶
  router.post('/api/accounts', async (ctx: any) => {
    const body = (await ctx.req.json()) as { ownerName: string; currency?: string }
    const core = ctx.get('core') as PlanetCore
    const bus = core.container.make<CommandBus>('cqrs.commandBus')

    const command = new CreateAccountCommand(randomUUID(), body.ownerName, body.currency || 'TWD')

    await bus.dispatch(command)

    return ctx.json({ success: true, accountId: command.accountId }, 201)
  })

  // 取得帳戶詳情
  router.get('/api/accounts/:id', async (ctx: any) => {
    const core = ctx.get('core') as PlanetCore
    const bus = core.container.make<QueryBus>('cqrs.queryBus')

    const query = new GetAccountDetailsQuery(ctx.req.param('id') as string)
    const result = await bus.execute(query)

    return ctx.json({ success: true, data: result })
  })

  // 查詢餘額
  router.get('/api/accounts/:id/balance', async (ctx: any) => {
    const core = ctx.get('core') as PlanetCore
    const bus = core.container.make<QueryBus>('cqrs.queryBus')

    const query = new GetAccountBalanceQuery(ctx.req.param('id') as string)
    const result = await bus.execute(query)

    return ctx.json({ success: true, data: result })
  })

  // 存款
  router.post('/api/accounts/:id/deposit', async (ctx: any) => {
    const body = (await ctx.req.json()) as { amount: number; currency?: string }
    const core = ctx.get('core') as PlanetCore
    const bus = core.container.make<CommandBus>('cqrs.commandBus')

    const command = new DepositFundsCommand(
      ctx.req.param('id') as string,
      Math.round(body.amount * 100),
      body.currency || 'TWD'
    )

    await bus.dispatch(command)

    return ctx.json({ success: true })
  })

  // 提款
  router.post('/api/accounts/:id/withdraw', async (ctx: any) => {
    const body = (await ctx.req.json()) as { amount: number; currency?: string }
    const core = ctx.get('core') as PlanetCore
    const bus = core.container.make<CommandBus>('cqrs.commandBus')

    const command = new WithdrawFundsCommand(
      ctx.req.param('id') as string,
      Math.round(body.amount * 100),
      body.currency || 'TWD'
    )

    await bus.dispatch(command)

    return ctx.json({ success: true })
  })

  // 轉帳
  router.post('/api/accounts/:id/transfer', async (ctx: any) => {
    const body = (await ctx.req.json()) as {
      toAccountId: string
      amount: number
      currency?: string
    }
    const core = ctx.get('core') as PlanetCore
    const bus = core.container.make<CommandBus>('cqrs.commandBus')

    const command = new TransferFundsCommand(
      ctx.req.param('id') as string,
      body.toAccountId,
      Math.round(body.amount * 100),
      body.currency || 'TWD'
    )

    await bus.dispatch(command)

    return ctx.json({ success: true })
  })

  // 交易記錄
  router.get('/api/accounts/:id/transactions', async (ctx: any) => {
    const core = ctx.get('core') as PlanetCore
    const bus = core.container.make<QueryBus>('cqrs.queryBus')

    const limitStr = ctx.req.query('limit') as string | undefined
    const offsetStr = ctx.req.query('offset') as string | undefined
    const limit = limitStr ? parseInt(limitStr) : 10
    const offset = offsetStr ? parseInt(offsetStr) : 0

    const query = new GetTransactionHistoryQuery(ctx.req.param('id') as string, limit, offset)
    const result = await bus.execute(query)

    return ctx.json({ success: true, data: result })
  })
}
