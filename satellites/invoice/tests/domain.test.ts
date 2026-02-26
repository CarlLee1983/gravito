import { describe, expect, it } from 'bun:test'
import { Invoice } from '../src/Domain/Entities/Invoice'

describe('Invoice Domain Entity', () => {
  describe('Invoice Creation', () => {
    it('應該能建立新發票且預設狀態為 ISSUED', () => {
      const invoice = Invoice.create({
        orderId: 'ord-123',
        invoiceNumber: 'INV-2025-001',
        amount: 1000,
        tax: 100,
        status: 'ISSUED',
      })

      expect(invoice.id).toBeDefined()
      expect(invoice.orderId).toBe('ord-123')
      expect(invoice.invoiceNumber).toBe('INV-2025-001')
      expect(invoice.amount).toBe(1000)
      expect(invoice.status).toBe('ISSUED')
    })

    it('應該能帶自定義 ID 建立', () => {
      const invoice = Invoice.create(
        {
          orderId: 'ord-123',
          invoiceNumber: 'INV-001',
          amount: 1000,
          tax: 100,
          status: 'ISSUED',
        },
        'inv-custom-123'
      )

      expect(invoice.id).toBe('inv-custom-123')
    })

    it('應該能設置發票號碼和稅額', () => {
      const invoice = Invoice.create({
        orderId: 'ord-456',
        invoiceNumber: 'INV-2025-999',
        amount: 5000,
        tax: 500,
        status: 'ISSUED',
      })

      expect(invoice.invoiceNumber).toBe('INV-2025-999')
      const props = invoice.unpack()
      expect(props.tax).toBe(500)
    })

    it('應該自動設置 createdAt', () => {
      const invoice = Invoice.create({
        orderId: 'ord-123',
        invoiceNumber: 'INV-001',
        amount: 1000,
        tax: 100,
        status: 'ISSUED',
      })

      const props = invoice.unpack()
      expect(props.createdAt).toBeInstanceOf(Date)
    })

    it('應該能設置買方和運送商識別碼', () => {
      const invoice = Invoice.create({
        orderId: 'ord-123',
        invoiceNumber: 'INV-001',
        amount: 1000,
        tax: 100,
        buyerIdentifier: 'buyer-123',
        carrierId: 'carrier-456',
        status: 'ISSUED',
      })

      const props = invoice.unpack()
      expect(props.buyerIdentifier).toBe('buyer-123')
      expect(props.carrierId).toBe('carrier-456')
    })
  })

  describe('Invoice Status Transitions', () => {
    it('應該能取消發票', () => {
      const invoice = Invoice.create({
        orderId: 'ord-123',
        invoiceNumber: 'INV-001',
        amount: 1000,
        tax: 100,
        status: 'ISSUED',
      })

      expect(invoice.status).toBe('ISSUED')
      invoice.cancel()
      expect(invoice.status).toBe('CANCELLED')
    })

    it('應該支援所有狀態類型', () => {
      const statuses: Array<'ISSUED' | 'CANCELLED' | 'RETURNED'> = [
        'ISSUED',
        'CANCELLED',
        'RETURNED',
      ]

      statuses.forEach((status) => {
        const invoice = Invoice.create({
          orderId: `ord-${status}`,
          invoiceNumber: `INV-${status}`,
          amount: 1000,
          tax: 100,
          status,
        })

        expect(invoice.status).toBe(status)
      })
    })
  })

  describe('Invoice Properties', () => {
    it('unpack() 應回傳完整的發票屬性', () => {
      const now = new Date()
      const invoice = Invoice.create({
        orderId: 'ord-123',
        invoiceNumber: 'INV-001',
        amount: 5000,
        tax: 500,
        buyerIdentifier: 'buyer-123',
        carrierId: 'carrier-456',
        status: 'ISSUED',
        createdAt: now,
      })

      const props = invoice.unpack()

      expect(props.orderId).toBe('ord-123')
      expect(props.invoiceNumber).toBe('INV-001')
      expect(props.amount).toBe(5000)
      expect(props.tax).toBe(500)
      expect(props.buyerIdentifier).toBe('buyer-123')
      expect(props.carrierId).toBe('carrier-456')
      expect(props.status).toBe('ISSUED')
      expect(props.createdAt).toBe(now)
    })

    it('unpack() 應回傳深層副本', () => {
      const invoice = Invoice.create({
        orderId: 'ord-123',
        invoiceNumber: 'INV-001',
        amount: 1000,
        tax: 100,
        status: 'ISSUED',
      })

      const props1 = invoice.unpack()
      const props2 = invoice.unpack()

      expect(props1).not.toBe(props2)
      expect(props1).toEqual(props2)
    })
  })

  describe('Invoice Calculations', () => {
    it('應該能計算含稅金額', () => {
      const invoice = Invoice.create({
        orderId: 'ord-123',
        invoiceNumber: 'INV-001',
        amount: 1000,
        tax: 100,
        status: 'ISSUED',
      })

      const props = invoice.unpack()
      const totalWithTax = props.amount + props.tax
      expect(totalWithTax).toBe(1100)
    })

    it('應該支援不同的稅率', () => {
      const invoices = [
        { amount: 1000, tax: 0 }, // 免稅
        { amount: 1000, tax: 50 }, // 5% 稅率
        { amount: 1000, tax: 100 }, // 10% 稅率
        { amount: 1000, tax: 200 }, // 20% 稅率
      ]

      invoices.forEach((data, idx) => {
        const invoice = Invoice.create({
          orderId: `ord-${idx}`,
          invoiceNumber: `INV-${idx}`,
          amount: data.amount,
          tax: data.tax,
          status: 'ISSUED',
        })

        const props = invoice.unpack()
        expect(props.amount + props.tax).toBe(data.amount + data.tax)
      })
    })
  })

  describe('Multiple Invoices', () => {
    it('應該能獨立建立多張發票', () => {
      const invoice1 = Invoice.create({
        orderId: 'ord-1',
        invoiceNumber: 'INV-001',
        amount: 1000,
        tax: 100,
        status: 'ISSUED',
      })

      const invoice2 = Invoice.create({
        orderId: 'ord-2',
        invoiceNumber: 'INV-002',
        amount: 2000,
        tax: 200,
        status: 'ISSUED',
      })

      expect(invoice1.id).not.toBe(invoice2.id)
      expect(invoice1.invoiceNumber).toBe('INV-001')
      expect(invoice2.invoiceNumber).toBe('INV-002')
    })

    it('不同發票的取消應互不影響', () => {
      const invoice1 = Invoice.create({
        orderId: 'ord-1',
        invoiceNumber: 'INV-001',
        amount: 1000,
        tax: 100,
        status: 'ISSUED',
      })

      const invoice2 = Invoice.create({
        orderId: 'ord-2',
        invoiceNumber: 'INV-002',
        amount: 2000,
        tax: 200,
        status: 'ISSUED',
      })

      invoice1.cancel()

      expect(invoice1.status).toBe('CANCELLED')
      expect(invoice2.status).toBe('ISSUED')
    })
  })
})
