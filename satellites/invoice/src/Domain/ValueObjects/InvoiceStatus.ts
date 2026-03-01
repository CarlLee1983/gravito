import { ValueObject } from '@gravito/enterprise'
import { InvalidTransitionError } from '../Errors/InvoiceError'

export type InvoiceStatusType = 'ISSUED' | 'CANCELLED' | 'RETURNED'

export interface InvoiceStatusProps {
  value: InvoiceStatusType
}

/**
 * 發票狀態 ValueObject
 * 實現狀態機：ISSUED → CANCELLED/RETURNED
 */
export class InvoiceStatus extends ValueObject<InvoiceStatusProps> {
  private constructor(value: InvoiceStatusType) {
    super({ value })
  }

  get value(): InvoiceStatusType {
    return this.props.value
  }

  /**
   * 建立初始狀態（ISSUED）
   */
  static issued(): InvoiceStatus {
    return new InvoiceStatus('ISSUED')
  }

  /**
   * 建立初始狀態（別名）
   */
  static initial(): InvoiceStatus {
    return new InvoiceStatus('ISSUED')
  }

  /**
   * 建立狀態
   */
  static create(value: InvoiceStatusType): InvoiceStatus {
    return new InvoiceStatus(value)
  }

  /**
   * 是否為已開立狀態
   */
  isIssued(): boolean {
    return this.value === 'ISSUED'
  }

  /**
   * 是否為已取消狀態
   */
  isCancelled(): boolean {
    return this.value === 'CANCELLED'
  }

  /**
   * 是否為已退回狀態
   */
  isReturned(): boolean {
    return this.value === 'RETURNED'
  }

  /**
   * 轉移到指定狀態
   */
  transitionTo(newStatus: InvoiceStatusType): InvoiceStatus {
    if (newStatus === this.value) {
      return new InvoiceStatus(newStatus)
    }

    if (newStatus === 'CANCELLED') {
      return this.toCancelled()
    }

    if (newStatus === 'RETURNED') {
      return this.toReturned()
    }

    throw new InvalidTransitionError(this.value, newStatus)
  }

  /**
   * 轉移到取消狀態
   */
  toCancelled(): InvoiceStatus {
    if (!this.isIssued()) {
      throw new InvalidTransitionError(this.value, 'CANCELLED')
    }
    return new InvoiceStatus('CANCELLED')
  }

  /**
   * 轉移到退回狀態
   */
  toReturned(): InvoiceStatus {
    if (!this.isIssued()) {
      throw new InvalidTransitionError(this.value, 'RETURNED')
    }
    return new InvoiceStatus('RETURNED')
  }

  /**
   * 檢查是否可被取消
   */
  canBeCancelled(): boolean {
    return this.isIssued()
  }

  /**
   * 檢查是否可被退回
   */
  canBeReturned(): boolean {
    return this.isIssued()
  }

  /**
   * 轉為字符串
   */
  toString(): string {
    return this.value
  }

  /**
   * 比較是否相同
   */
  override equals(other: InvoiceStatus): boolean {
    return this.value === other.value
  }
}
