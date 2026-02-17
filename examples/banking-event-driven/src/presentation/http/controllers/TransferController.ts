import type { GravitoContext } from '@gravito/core'
import type { InitiateTransferCommandHandler } from '../../../application/commands/InitiateTransferCommand'
import { InitiateTransferCommand } from '../../../application/commands/InitiateTransferCommand'
import type { GetTransactionHistoryQueryHandler } from '../../../application/queries/GetTransactionHistoryQuery'
import { GetTransactionHistoryQuery } from '../../../application/queries/GetTransactionHistoryQuery'
import type { TransferSaga } from '../../../application/sagas/TransferSaga'

export class TransferController {
  constructor(
    private readonly initiateTransferHandler: InitiateTransferCommandHandler,
    private readonly getTransactionHistoryHandler: GetTransactionHistoryQueryHandler,
    private readonly transferSaga: TransferSaga
  ) {}

  async initiateTransfer(c: GravitoContext): Promise<Response> {
    try {
      const body = await c.req.json<{
        fromAccountId: string
        toAccountId: string
        amountCents: number
      }>()

      const transferId = crypto.randomUUID()
      await this.initiateTransferHandler.handle(
        new InitiateTransferCommand(
          transferId,
          body.fromAccountId,
          body.toAccountId,
          body.amountCents
        )
      )

      return c.json({ success: true, data: { transferId } }, 201)
    } catch (error) {
      return c.json(
        { success: false, error: error instanceof Error ? error.message : '未知錯誤' },
        400
      )
    }
  }

  async getTransferStatus(c: GravitoContext): Promise<Response> {
    try {
      const id = c.req.param('id')
      if (!id) {
        return c.json({ success: false, error: '缺少轉帳 ID' }, 400)
      }
      const state = this.transferSaga.getSagaState(id)

      if (!state) {
        return c.json({ success: false, error: '轉帳記錄不存在' }, 404)
      }

      return c.json({ success: true, data: state })
    } catch (error) {
      return c.json(
        { success: false, error: error instanceof Error ? error.message : '未知錯誤' },
        500
      )
    }
  }

  async getTransactionHistory(c: GravitoContext): Promise<Response> {
    try {
      const id = c.req.param('id')
      if (!id) {
        return c.json({ success: false, error: '缺少帳戶 ID' }, 400)
      }
      const limit = Number(c.req.query('limit') ?? '20')
      const offset = Number(c.req.query('offset') ?? '0')

      const transactions = await this.getTransactionHistoryHandler.handle(
        new GetTransactionHistoryQuery(id, limit, offset)
      )

      return c.json({ success: true, data: transactions })
    } catch (error) {
      return c.json(
        { success: false, error: error instanceof Error ? error.message : '未知錯誤' },
        500
      )
    }
  }
}
