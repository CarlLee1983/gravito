import { type Container, ServiceProvider } from '@gravito/core'
import { CancelInvoice } from './Application/UseCases/CancelInvoice'
import { IssueInvoice } from './Application/UseCases/IssueInvoice'
import {
  GenerateInvoiceReport,
  QueryInvoiceStatus,
} from './Application/UseCases/QueryInvoiceStatus'
import { AtlasInvoiceRepository } from './Infrastructure/Persistence/AtlasInvoiceRepository'
import { AdminInvoiceController } from './Interface/Http/Controllers/AdminInvoiceController'

// Infrastructure Exports
export type { IInvoiceRepository } from './Domain/Contracts/IInvoiceRepository'
// Domain Exports
export { Invoice, type InvoiceProps, type InvoiceSnapshot } from './Domain/Entities/Invoice'
export {
  DuplicateInvoiceError,
  InvalidAmountError,
  InvalidCancellationError,
  InvalidInvoiceNumberError,
  InvalidTaxError,
  InvalidTransitionError,
  InvoiceError,
  InvoiceNotFoundError,
} from './Domain/Errors/InvoiceError'
export { InvoiceAmount, type InvoiceAmountProps } from './Domain/ValueObjects/InvoiceAmount'
export { InvoiceNumber, type InvoiceNumberProps } from './Domain/ValueObjects/InvoiceNumber'
export { InvoiceStatus, type InvoiceStatusType } from './Domain/ValueObjects/InvoiceStatus'
export { InvoiceTax, type InvoiceTaxProps } from './Domain/ValueObjects/InvoiceTax'
export { AtlasInvoiceRepository } from './Infrastructure/Persistence/AtlasInvoiceRepository'

export class InvoiceServiceProvider extends ServiceProvider {
  register(container: Container): void {
    // 註冊 Repository
    container.singleton('invoice.repository', () => new AtlasInvoiceRepository())

    // 註冊 UseCase
    container.bind(
      'invoice.usecase.issue',
      () => new IssueInvoice(container.make('invoice.repository'))
    )
    container.bind(
      'invoice.usecase.cancel',
      () => new CancelInvoice(container.make('invoice.repository'))
    )
    container.bind(
      'invoice.usecase.query',
      () => new QueryInvoiceStatus(container.make('invoice.repository'))
    )
    container.bind(
      'invoice.usecase.report',
      () => new GenerateInvoiceReport(container.make('invoice.repository'))
    )

    // 註冊 Controller
    container.singleton('invoice.controller.admin', () => new AdminInvoiceController(this.core!))
  }

  override boot(): void {
    const core = this.core
    if (!core) {
      return
    }

    core.logger.info('🧾 Invoice Satellite is ready')

    const controller = core.container.make<AdminInvoiceController>('invoice.controller.admin')

    // 註冊管理路由
    core.router.prefix('/api/admin/v1/invoices').group((router) => {
      // 發票列表
      router.get('/', (ctx) => controller.index(ctx))

      // 開立發票
      router.post('/', (ctx) => controller.store(ctx))

      // 查詢發票狀態
      router.get('/:id', (ctx) => controller.show(ctx))

      // 取消發票
      router.post('/:id/cancel', (ctx) => controller.cancel(ctx))

      // 生成報告
      router.get('/report', (ctx) => controller.report(ctx))
    })

    /**
     * 自動化 Hook: 支付成功後自動開票
     */
    core.hooks.addAction(
      'order:paid',
      async (payload: { orderId: string; amount: number; buyer?: any }) => {
        core.logger.info(`[Invoice] Triggering auto-issuance for order: ${payload.orderId}`)

        const issueUseCase = core.container.make<IssueInvoice>('invoice.usecase.issue')

        try {
          const invoice = await issueUseCase.execute({
            orderId: payload.orderId,
            amount: payload.amount,
            buyerIdentifier: payload.buyer?.identifier,
            carrierId: payload.buyer?.carrierId,
          })
          core.logger.info(`[Invoice] Automatically issued: ${invoice.invoiceNumber.value}`)
        } catch (error: any) {
          core.logger.error(`[Invoice] Auto-issue failed: ${error.message}`)
        }
      }
    )
  }
}
