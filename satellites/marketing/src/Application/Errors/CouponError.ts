/**
 * CouponError hierarchy
 */
export class CouponError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CouponError'
  }
}

export class CouponNotFoundError extends CouponError {
  constructor() {
    super('優惠券不存在')
    this.name = 'CouponNotFoundError'
  }
}

export class CouponExpiredError extends CouponError {
  constructor() {
    super('優惠券已過期')
    this.name = 'CouponExpiredError'
  }
}

export class CouponNotActiveError extends CouponError {
  constructor() {
    super('優惠券尚未啟用')
    this.name = 'CouponNotActiveError'
  }
}

export class CouponDisabledError extends CouponError {
  constructor() {
    super('優惠券已停用')
    this.name = 'CouponDisabledError'
  }
}

export class CouponUsageLimitExceededError extends CouponError {
  constructor() {
    super('優惠券使用次數已用盡')
    this.name = 'CouponUsageLimitExceededError'
  }
}

export class CouponMinPurchaseNotMetError extends CouponError {
  constructor(minAmount: number) {
    super(`訂單金額未達最低消費 ${minAmount}`)
    this.name = 'CouponMinPurchaseNotMetError'
  }
}

export class CouponCodeAlreadyExistsError extends CouponError {
  constructor(code: string) {
    super(`優惠券代碼 ${code} 已存在`)
    this.name = 'CouponCodeAlreadyExistsError'
  }
}

export class InvalidCouponCodeError extends CouponError {
  constructor() {
    super('無效的優惠券代碼格式')
    this.name = 'InvalidCouponCodeError'
  }
}
