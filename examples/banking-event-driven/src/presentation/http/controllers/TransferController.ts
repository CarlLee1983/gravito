import type { GravitoContext } from '@gravito/core'
import type { InitiateTransferCommandHandler } from '../../../application/commands/InitiateTransferCommand'
import { InitiateTransferCommand } from '../../../application/commands/InitiateTransferCommand'
import type { GetTransactionHistoryQueryHandler } from '../../../application/queries/GetTransactionHistoryQuery'
import { GetTransactionHistoryQuery } from '../../../application/queries/GetTransactionHistoryQuery'
import type { TransferSaga } from '../../../application/sagas/TransferSaga'
import { AccountParamRequest } from '../requests/AccountParamRequest'
import { GetTransactionHistoryRequest } from '../requests/GetTransactionHistoryRequest'
import { InitiateTransferRequest } from '../requests/InitiateTransferRequest'
import { BaseController } from './BaseController'

export class TransferController extends BaseController {
  constructor(
    private readonly initiateTransferHandler: InitiateTransferCommandHandler,
    private readonly getTransactionHistoryHandler: GetTransactionHistoryQueryHandler,
    private readonly transferSaga: TransferSaga
  ) {
    super()
  }

  async initiateTransfer(c: GravitoContext): Promise<Response> {
    try {
      const data = await this.validate(c, InitiateTransferRequest)

      const transferId = crypto.randomUUID()
      await this.initiateTransferHandler.handle(
        new InitiateTransferCommand(
          transferId,
          data.fromAccountId,
          data.toAccountId,
          data.amountCents
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
      const data = await this.validate(c, AccountParamRequest)
      const state = this.transferSaga.getSagaState(data.id)

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
      const id = c.req.param('id') as string
      const data = await this.validate(c, GetTransactionHistoryRequest)

      const transactions = await this.getTransactionHistoryHandler.handle(
        new GetTransactionHistoryQuery(id, data.limit, data.offset)
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
