import { Model } from '@gravito/atlas'
import type { IInvoiceRepository } from '../../Domain/Contracts/IInvoiceRepository'
import { Invoice } from '../../Domain/Entities/Invoice'

class InvoiceModel extends Model {
  static override table = 'invoices'
}

/**
 * Atlas ORM 發票 Repository
 * 實現 IInvoiceRepository 介面
 */
export class AtlasInvoiceRepository implements IInvoiceRepository {
  async save(invoice: Invoice): Promise<void> {
    const snapshot = invoice.toSnapshot()
    const data = {
      id: snapshot.id,
      orderId: snapshot.orderId,
      invoiceNumber: snapshot.invoiceNumber,
      amount: snapshot.amount,
      amountCurrency: snapshot.amountCurrency,
      tax: snapshot.tax,
      taxRate: snapshot.taxRate,
      status: snapshot.status,
      buyerIdentifier: snapshot.buyerIdentifier,
      carrierId: snapshot.carrierId,
      createdAt: snapshot.createdAt,
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
    if (!row) {
      return null
    }
    const snapshot = row as any
    return Invoice.fromSnapshot({
      id: snapshot.id,
      orderId: snapshot.orderId,
      invoiceNumber: snapshot.invoiceNumber,
      amount: snapshot.amount,
      amountCurrency: snapshot.amountCurrency,
      tax: snapshot.tax,
      taxRate: snapshot.taxRate,
      status: snapshot.status,
      buyerIdentifier: snapshot.buyerIdentifier,
      carrierId: snapshot.carrierId,
      createdAt: snapshot.createdAt,
    })
  }

  async findByOrderId(orderId: string): Promise<Invoice | null> {
    const row = await (InvoiceModel.query() as any).where('orderId', orderId).first()
    if (!row) {
      return null
    }
    const snapshot = row
    return Invoice.fromSnapshot({
      id: snapshot.id,
      orderId: snapshot.orderId,
      invoiceNumber: snapshot.invoiceNumber,
      amount: snapshot.amount,
      amountCurrency: snapshot.amountCurrency,
      tax: snapshot.tax,
      taxRate: snapshot.taxRate,
      status: snapshot.status,
      buyerIdentifier: snapshot.buyerIdentifier,
      carrierId: snapshot.carrierId,
      createdAt: snapshot.createdAt,
    })
  }

  async findAll(): Promise<Invoice[]> {
    const rows = await InvoiceModel.all()
    return rows.map((row) =>
      Invoice.fromSnapshot({
        id: (row as any).id,
        orderId: (row as any).orderId,
        invoiceNumber: (row as any).invoiceNumber,
        amount: (row as any).amount,
        amountCurrency: (row as any).amountCurrency,
        tax: (row as any).tax,
        taxRate: (row as any).taxRate,
        status: (row as any).status,
        buyerIdentifier: (row as any).buyerIdentifier,
        carrierId: (row as any).carrierId,
        createdAt: (row as any).createdAt,
      })
    )
  }

  /**
   * 按發票號碼查詢
   */
  async findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null> {
    const row = await (InvoiceModel.query() as any).where('invoiceNumber', invoiceNumber).first()
    if (!row) {
      return null
    }
    const snapshot = row
    return Invoice.fromSnapshot({
      id: snapshot.id,
      orderId: snapshot.orderId,
      invoiceNumber: snapshot.invoiceNumber,
      amount: snapshot.amount,
      amountCurrency: snapshot.amountCurrency,
      tax: snapshot.tax,
      taxRate: snapshot.taxRate,
      status: snapshot.status,
      buyerIdentifier: snapshot.buyerIdentifier,
      carrierId: snapshot.carrierId,
      createdAt: snapshot.createdAt,
    })
  }

  /**
   * 按狀態查詢
   */
  async findByStatus(status: string): Promise<Invoice[]> {
    const rows = await (InvoiceModel.query() as any).where('status', status)
    return rows.map((row: any) =>
      Invoice.fromSnapshot({
        id: row.id,
        orderId: row.orderId,
        invoiceNumber: row.invoiceNumber,
        amount: row.amount,
        amountCurrency: row.amountCurrency,
        tax: row.tax,
        taxRate: row.taxRate,
        status: row.status,
        buyerIdentifier: row.buyerIdentifier,
        carrierId: row.carrierId,
        createdAt: row.createdAt,
      })
    )
  }

  /**
   * 按日期範圍查詢
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Invoice[]> {
    const rows = await (InvoiceModel.query() as any).whereBetween('createdAt', [startDate, endDate])

    return rows.map((row: any) =>
      Invoice.fromSnapshot({
        id: row.id,
        orderId: row.orderId,
        invoiceNumber: row.invoiceNumber,
        amount: row.amount,
        amountCurrency: row.amountCurrency,
        tax: row.tax,
        taxRate: row.taxRate,
        status: row.status,
        buyerIdentifier: row.buyerIdentifier,
        carrierId: row.carrierId,
        createdAt: row.createdAt,
      })
    )
  }
}
