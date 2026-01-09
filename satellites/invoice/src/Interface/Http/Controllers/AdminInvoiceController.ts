import type { PlanetCore } from '@gravito/core'
import type { IssueInvoice } from '../../../Application/UseCases/IssueInvoice'
import type { Invoice } from '../../../Domain/Entities/Invoice'

export class AdminInvoiceController {
  constructor(private core: PlanetCore) {}

  async index(ctx: any) {
    // 獲取所有發票清單
    const repo = this.core.container.make('invoice.repository') as any
    const invoices = await repo.findAll()
    return ctx.json(
      invoices.map((inv: Invoice) => ({
        id: inv.id,
        ...inv.unpack(),
      }))
    )
  }

  async store(ctx: any) {
    const body = await ctx.req.json()
    const useCase = this.core.container.make<IssueInvoice>('invoice.usecase.issue')
    const invoice = await useCase.execute(body)
    return ctx.json({
      success: true,
      data: {
        id: invoice.id,
        number: invoice.invoiceNumber,
      },
    })
  }
}
