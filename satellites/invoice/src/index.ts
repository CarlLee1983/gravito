import { type Container, ServiceProvider } from '@gravito/core'
import { IssueInvoice } from './Application/UseCases/IssueInvoice'
import { AtlasInvoiceRepository } from './Infrastructure/Persistence/AtlasInvoiceRepository'
import { AdminInvoiceController } from './Interface/Http/Controllers/AdminInvoiceController'

export class InvoiceServiceProvider extends ServiceProvider {
  register(container: Container): void {
    container.singleton('invoice.repository', () => new AtlasInvoiceRepository())
    container.bind(
      'invoice.usecase.issue',
      () => new IssueInvoice(container.make('invoice.repository'))
    )
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
      router.get('/', (ctx) => controller.index(ctx))
      router.post('/', (ctx) => controller.store(ctx))
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
          core.logger.info(`[Invoice] Automatically issued: ${invoice.invoiceNumber}`)
        } catch (error: any) {
          core.logger.error(`[Invoice] Auto-issue failed: ${error.message}`)
        }
      }
    )
  }
}
