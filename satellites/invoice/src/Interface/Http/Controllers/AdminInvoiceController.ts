import type { PlanetCore } from '@gravito/core'
import type { CancelInvoice } from '../../../Application/UseCases/CancelInvoice'
import type { IssueInvoice } from '../../../Application/UseCases/IssueInvoice'
import type {
  GenerateInvoiceReport,
  QueryInvoiceStatus,
} from '../../../Application/UseCases/QueryInvoiceStatus'
import type { Invoice } from '../../../Domain/Entities/Invoice'
import {
  DuplicateInvoiceError,
  InvalidCancellationError,
  InvoiceError,
  InvoiceNotFoundError,
} from '../../../Domain/Errors/InvoiceError'

/**
 * 發票管理控制器
 * 提供完整的 API 端點
 */
export class AdminInvoiceController {
  constructor(private core: PlanetCore) {}

  /**
   * GET /invoices - 列表查詢發票
   */
  async index(ctx: any) {
    try {
      const repo = this.core.container.make('invoice.repository') as any
      const invoices = await repo.findAll()

      return ctx.json({
        success: true,
        data: invoices.map((inv: Invoice) => inv.unpack()),
        meta: {
          total: invoices.length,
        },
      })
    } catch (error) {
      this.logError('Failed to list invoices', error)
      return ctx.json(
        {
          success: false,
          error: '無法獲取發票列表',
        },
        500
      )
    }
  }

  /**
   * POST /invoices - 開立新發票
   */
  async store(ctx: any) {
    try {
      const body = await ctx.req.json()

      // 驗證必要欄位
      if (!body.orderId || !body.amount) {
        return ctx.json(
          {
            success: false,
            error: '缺少必要欄位：orderId, amount',
          },
          400
        )
      }

      const useCase = this.core.container.make<IssueInvoice>('invoice.usecase.issue')
      const invoice = await useCase.execute(body)

      return ctx.json({
        success: true,
        data: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          orderId: invoice.orderId,
          amount: invoice.amount,
          status: invoice.status,
          createdAt: invoice.createdAt,
        },
      })
    } catch (error) {
      return this.handleError(ctx, error, 'Failed to issue invoice')
    }
  }

  /**
   * GET /invoices/:id - 查詢發票狀態
   */
  async show(ctx: any) {
    try {
      const invoiceId = ctx.param('id')

      if (!invoiceId) {
        return ctx.json(
          {
            success: false,
            error: '缺少發票 ID',
          },
          400
        )
      }

      const useCase = this.core.container.make<QueryInvoiceStatus>('invoice.usecase.query')
      const result = await useCase.execute({ invoiceId })

      return ctx.json({
        success: true,
        data: result,
      })
    } catch (error) {
      return this.handleError(ctx, error, 'Failed to query invoice status')
    }
  }

  /**
   * POST /invoices/:id/cancel - 取消發票
   */
  async cancel(ctx: any) {
    try {
      const invoiceId = ctx.param('id')
      const body = await ctx.req.json()

      if (!invoiceId) {
        return ctx.json(
          {
            success: false,
            error: '缺少發票 ID',
          },
          400
        )
      }

      if (!body.reason) {
        return ctx.json(
          {
            success: false,
            error: '缺少取消原因',
          },
          400
        )
      }

      const useCase = this.core.container.make<CancelInvoice>('invoice.usecase.cancel')
      const result = await useCase.execute({
        invoiceId,
        reason: body.reason,
        notes: body.notes,
      })

      return ctx.json({
        success: true,
        data: result,
      })
    } catch (error) {
      return this.handleError(ctx, error, 'Failed to cancel invoice')
    }
  }

  /**
   * GET /invoices/report - 生成發票報告
   */
  async report(ctx: any) {
    try {
      const startDate = ctx.query('startDate')
      const endDate = ctx.query('endDate')

      if (!startDate || !endDate) {
        return ctx.json(
          {
            success: false,
            error: '缺少日期範圍參數：startDate, endDate',
          },
          400
        )
      }

      const start = new Date(startDate)
      const end = new Date(endDate)

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return ctx.json(
          {
            success: false,
            error: '無效的日期格式',
          },
          400
        )
      }

      const useCase = this.core.container.make<GenerateInvoiceReport>('invoice.usecase.report')
      const report = await useCase.execute({
        startDate: start,
        endDate: end,
      })

      return ctx.json({
        success: true,
        data: report,
      })
    } catch (error) {
      this.logError('Failed to generate report', error)
      return ctx.json(
        {
          success: false,
          error: '無法生成報告',
        },
        500
      )
    }
  }

  /**
   * 處理錯誤
   */
  private handleError(ctx: any, error: unknown, message: string): any {
    if (error instanceof InvoiceNotFoundError) {
      return ctx.json(
        {
          success: false,
          error: error.message,
        },
        404
      )
    }

    if (error instanceof DuplicateInvoiceError) {
      return ctx.json(
        {
          success: false,
          error: error.message,
        },
        409
      )
    }

    if (error instanceof InvalidCancellationError) {
      return ctx.json(
        {
          success: false,
          error: error.message,
        },
        400
      )
    }

    if (error instanceof InvoiceError) {
      this.logError(message, error)
      return ctx.json(
        {
          success: false,
          error: error.message,
        },
        400
      )
    }

    this.logError(message, error)
    return ctx.json(
      {
        success: false,
        error: '伺服器內部錯誤',
      },
      500
    )
  }

  /**
   * 記錄錯誤
   */
  private logError(message: string, error: unknown): void {
    if (this.core?.logger) {
      this.core.logger.error(
        `[Invoice] ${message}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}
