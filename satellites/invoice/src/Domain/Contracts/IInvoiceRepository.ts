import type { Invoice } from '../Entities/Invoice'

export interface IInvoiceRepository {
  save(invoice: Invoice): Promise<void>
  findById(id: string): Promise<Invoice | null>
  findByOrderId(orderId: string): Promise<Invoice | null>
  findAll(): Promise<Invoice[]>
}
