import type { GravitoContext } from '@gravito/core'
import { InitiateTransferCommand, type InitiateTransferCommandHandler } from '#application/commands'
import {
  GetTransactionHistoryQuery,
  type GetTransactionHistoryQueryHandler,
} from '#application/queries'
import type { TransferSaga } from '#application/sagas/TransferSaga'
import { NotFoundError } from '#presentation/http/errors'
import {
  AccountParamRequest,
  GetTransactionHistoryRequest,
  InitiateTransferRequest,
} from '#presentation/http/requests'
import { BaseController } from './BaseController'

/**
 * Controller handling HTTP requests related to fund transfers.
 * Orchestrates transfer initiation, status tracking, and transaction history.
 */
export class TransferController extends BaseController {
  constructor(
    private readonly initiateTransferHandler: InitiateTransferCommandHandler,
    private readonly getTransactionHistoryHandler: GetTransactionHistoryQueryHandler,
    private readonly transferSaga: TransferSaga
  ) {
    super()
  }

  /**
   * Endpoint to initiate a fund transfer between two accounts.
   * POST /api/transfers
   */
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
      return this.handleError(c, error)
    }
  }

  /**
   * Endpoint to check the current status of a transfer saga.
   * GET /api/transfers/:id
   */
  async getTransferStatus(c: GravitoContext): Promise<Response> {
    try {
      const data = await this.validate(c, AccountParamRequest)
      const state = this.transferSaga.getSagaState(data.id)

      if (!state) {
        throw new NotFoundError('Transfer record not found')
      }

      return c.json({ success: true, data: state })
    } catch (error) {
      return this.handleError(c, error)
    }
  }

  /**
   * Endpoint to retrieve transaction history for a specific account.
   * GET /api/accounts/:id/transactions
   */
  async getTransactionHistory(c: GravitoContext): Promise<Response> {
    try {
      const id = c.req.param('id') as string
      const data = await this.validate(c, GetTransactionHistoryRequest)

      const transactions = await this.getTransactionHistoryHandler.handle(
        new GetTransactionHistoryQuery(id, data.limit, data.offset)
      )

      return c.json({ success: true, data: transactions })
    } catch (error) {
      return this.handleError(c, error)
    }
  }
}
