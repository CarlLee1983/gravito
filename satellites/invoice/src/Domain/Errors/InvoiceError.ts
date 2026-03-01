/**
 * 發票領域錯誤基類
 */
export class InvoiceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvoiceError'
  }
}

/**
 * 重複發票錯誤（同一訂單已有發票）
 */
export class DuplicateInvoiceError extends InvoiceError {
  constructor(orderId: string) {
    super(`Order ${orderId} already has an invoice`)
    this.name = 'DuplicateInvoiceError'
  }
}

/**
 * 無效金額錯誤
 */
export class InvalidAmountError extends InvoiceError {
  constructor(amount: number) {
    super(`Invalid amount: ${amount}`)
    this.name = 'InvalidAmountError'
  }
}

/**
 * 無效稅額錯誤
 */
export class InvalidTaxError extends InvoiceError {
  constructor(tax: number) {
    super(`Invalid tax: ${tax}`)
    this.name = 'InvalidTaxError'
  }
}

/**
 * 無效狀態轉移錯誤
 */
export class InvalidTransitionError extends InvoiceError {
  constructor(currentStatus: string, targetStatus: string) {
    super(`Cannot transition from ${currentStatus} to ${targetStatus}`)
    this.name = 'InvalidTransitionError'
  }
}

/**
 * 無效發票號錯誤
 */
export class InvalidInvoiceNumberError extends InvoiceError {
  constructor(number: string) {
    super(`Invalid invoice number: ${number}`)
    this.name = 'InvalidInvoiceNumberError'
  }
}

/**
 * 發票未找到錯誤
 */
export class InvoiceNotFoundError extends InvoiceError {
  constructor(invoiceId: string) {
    super(`Invoice ${invoiceId} not found`)
    this.name = 'InvoiceNotFoundError'
  }
}

/**
 * 無效取消錯誤
 */
export class InvalidCancellationError extends InvoiceError {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidCancellationError'
  }
}

/**
 * 無效訂單 ID 錯誤
 */
export class InvalidOrderIdError extends InvoiceError {
  constructor(orderId: string) {
    super(`Invalid order ID: ${orderId}`)
    this.name = 'InvalidOrderIdError'
  }
}
