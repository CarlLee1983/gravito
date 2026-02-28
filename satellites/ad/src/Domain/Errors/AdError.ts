/**
 * 廣告錯誤碼
 */
export enum AdErrorCode {
  INVALID_WEIGHT = 'INVALID_WEIGHT',
  INVALID_SCHEDULE = 'INVALID_SCHEDULE',
  INVALID_SLOT = 'INVALID_SLOT',
  AD_NOT_FOUND = 'AD_NOT_FOUND',
  INVALID_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION',
  AD_EXPIRED = 'AD_EXPIRED',
  NO_ACTIVE_ADS = 'NO_ACTIVE_ADS',
  INVALID_URL = 'INVALID_URL',
}

/**
 * 廣告業務錯誤
 *
 * 統一的領域錯誤機制，透過靜態工廠方法建立各類業務錯誤。
 */
export class AdError extends Error {
  constructor(
    message: string,
    public readonly code: AdErrorCode,
    public readonly statusCode: number = 400
  ) {
    super(message)
    this.name = 'AdError'
  }

  static invalidWeight(value: number): AdError {
    return new AdError(
      `無效的廣告權重: ${value}，權重必須在 1-10 之間`,
      AdErrorCode.INVALID_WEIGHT,
      400
    )
  }

  static invalidSchedule(reason: string): AdError {
    return new AdError(`無效的廣告排程: ${reason}`, AdErrorCode.INVALID_SCHEDULE, 400)
  }

  static invalidSlot(slug: string): AdError {
    return new AdError(`無效的廣告版位: ${slug}`, AdErrorCode.INVALID_SLOT, 400)
  }

  static adNotFound(id: string): AdError {
    return new AdError(`廣告未找到: ${id}`, AdErrorCode.AD_NOT_FOUND, 404)
  }

  static invalidStatusTransition(from: string, to: string): AdError {
    return new AdError(
      `無效的狀態轉移: ${from} -> ${to}`,
      AdErrorCode.INVALID_STATUS_TRANSITION,
      400
    )
  }

  static adExpired(id: string): AdError {
    return new AdError(`廣告已過期: ${id}`, AdErrorCode.AD_EXPIRED, 400)
  }

  static noActiveAds(slot: string): AdError {
    return new AdError(`版位無活躍廣告: ${slot}`, AdErrorCode.NO_ACTIVE_ADS, 404)
  }

  static invalidUrl(url: string): AdError {
    return new AdError(`無效的網址: ${url}`, AdErrorCode.INVALID_URL, 400)
  }
}
