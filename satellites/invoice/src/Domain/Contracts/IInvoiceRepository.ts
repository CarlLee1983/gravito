import type { Invoice } from '../Entities/Invoice'

export interface IInvoiceRepository {
  save(invoice: Invoice): Promise<void>
  findById(id: string): Promise<Invoice | null>
  findByOrderId(orderId: string): Promise<Invoice | null>
  findAll(): Promise<Invoice[]>
  findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null>
  findByStatus(status: string): Promise<Invoice[]>
  findByDateRange(startDate: Date, endDate: Date): Promise<Invoice[]>
}
