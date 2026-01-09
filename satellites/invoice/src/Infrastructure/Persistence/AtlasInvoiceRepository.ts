import { Model } from '@gravito/atlas'
import type { IInvoiceRepository } from '../../Domain/Contracts/IInvoiceRepository'
import { Invoice } from '../../Domain/Entities/Invoice'

class InvoiceModel extends Model {
  static override table = 'invoices'
}

export class AtlasInvoiceRepository implements IInvoiceRepository {
  async save(invoice: Invoice): Promise<void> {
    const data = {
      id: invoice.id,
      ...invoice.unpack(),
    }

    const existing = await InvoiceModel.find(invoice.id)
    if (existing) {
      await (InvoiceModel.query() as any).where('id', invoice.id).update(data)
    } else {
      await (InvoiceModel.query() as any).insert(data)
    }
  }

  async findById(id: string): Promise<Invoice | null> {
    const row = await InvoiceModel.find(id)
    return row ? Invoice.create((row as any).props, (row as any).props.id) : null
  }

  async findByOrderId(orderId: string): Promise<Invoice | null> {
    const row = await (InvoiceModel.query() as any).where('order_id', orderId).first()
    return row ? Invoice.create(row.props, row.props.id) : null
  }

  async findAll(): Promise<Invoice[]> {
    const rows = await InvoiceModel.all()
    return rows.map((row) => Invoice.create((row as any).props, (row as any).props.id))
  }
}
