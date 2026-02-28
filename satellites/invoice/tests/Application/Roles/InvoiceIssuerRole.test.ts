import { describe, expect, it } from 'bun:test'
import {
  DefaultInvoiceIssuer,
  injectInvoiceIssuer,
} from '../../../src/Application/Roles/InvoiceIssuerRole'

describe('InvoiceIssuerRole', () => {
  it('應該生成有效的發票號碼', () => {
    const issuer = new DefaultInvoiceIssuer()
    const invoiceNumber = issuer.generateInvoiceNumber()

    expect(invoiceNumber.value).toMatch(/^GX-\d{8}$/)
  })

  it('應該生成不同的發票號碼', () => {
    const issuer = new DefaultInvoiceIssuer()
    const number1 = issuer.generateInvoiceNumber()
    const number2 = issuer.generateInvoiceNumber()

    expect(number1.value).not.toBe(number2.value)
  })

  it('應該計算預設稅額（5%）', () => {
    const issuer = new DefaultInvoiceIssuer()
    const tax = issuer.calculateTax(1000)

    expect(tax.value).toBe(50)
    expect(tax.rate).toBe(0.05)
  })

  it('應該計算自訂稅率的稅額', () => {
    const issuer = new DefaultInvoiceIssuer()
    const tax = issuer.calculateTax(1000, 0.1)

    expect(tax.value).toBe(100)
    expect(tax.rate).toBe(0.1)
  })

  it('應該驗證有效的訂單', async () => {
    const issuer = new DefaultInvoiceIssuer()
    const result = await issuer.validateOrderForInvoicing('order-123')

    expect(result).toBe(true)
  })

  it('應該拒絕無效的訂單 ID', async () => {
    const issuer = new DefaultInvoiceIssuer()

    const result1 = await issuer.validateOrderForInvoicing('')
    const result2 = await issuer.validateOrderForInvoicing(null as any)
    const result3 = await issuer.validateOrderForInvoicing(undefined as any)

    expect(result1).toBe(false)
    expect(result2).toBe(false)
    expect(result3).toBe(false)
  })

  it('應該能透過注入函式取得角色', () => {
    const issuer = injectInvoiceIssuer()

    expect(issuer).toBeDefined()
    expect(issuer.generateInvoiceNumber).toBeDefined()
    expect(issuer.calculateTax).toBeDefined()
    expect(issuer.validateOrderForInvoicing).toBeDefined()
  })
})
