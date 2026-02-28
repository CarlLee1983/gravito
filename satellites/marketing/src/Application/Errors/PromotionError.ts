/**
 * PromotionError hierarchy
 */
export class PromotionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PromotionError'
  }
}

export class PromotionNotFoundError extends PromotionError {
  constructor() {
    super('促銷活動不存在')
    this.name = 'PromotionNotFoundError'
  }
}

export class PromotionInvalidConfigError extends PromotionError {
  constructor(message?: string) {
    super(message || '促銷活動配置無效')
    this.name = 'PromotionInvalidConfigError'
  }
}

export class PromotionInvalidDateRangeError extends PromotionError {
  constructor() {
    super('促銷開始時間必須早於結束時間')
    this.name = 'PromotionInvalidDateRangeError'
  }
}

export class PromotionNotActiveError extends PromotionError {
  constructor() {
    super('促銷活動未啟用')
    this.name = 'PromotionNotActiveError'
  }
}

export class PromotionExpiredError extends PromotionError {
  constructor() {
    super('促銷活動已過期')
    this.name = 'PromotionExpiredError'
  }
}
