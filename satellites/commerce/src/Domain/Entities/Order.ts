import { AggregateRoot } from '@gravito/enterprise'
import { CommerceError } from '../../Application/Errors/CommerceError'
import type { Adjustment } from '../ValueObjects/Adjustment'
import type { LineItem } from '../ValueObjects/LineItem'
import { Money } from '../ValueObjects/Money'

/**
 * 訂單狀態
 */
export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REQUESTED_REFUND = 'requested_refund',
  REFUNDED = 'refunded',
}

/**
 * Order 屬性介面
 */
export interface OrderProps {
  memberId: string | null
  idempotencyKey?: string
  status: OrderStatus
  subtotal: Money
  adjustmentAmount: Money
  total: Money
  currency: string
  items: LineItem[]
  adjustments: Adjustment[]
  createdAt: Date
  updatedAt: Date
}

/**
 * Order AggregateRoot
 *
 * 訂單聚合根，管理訂單的完整生命週期。
 * 使用私有欄位和方法控制狀態修改，確保一致性。
 */
export class Order extends AggregateRoot<string> {
  private _memberId: string | null
  private _idempotencyKey?: string
  private _status: OrderStatus
  private _subtotal: Money
  private _adjustmentAmount: Money
  private _total: Money
  private _currency: string
  private _items: LineItem[]
  private _adjustments: Adjustment[]
  private _createdAt: Date
  private _updatedAt: Date

  private constructor(id: string, props: OrderProps) {
    super(id)
    this._memberId = props.memberId
    this._idempotencyKey = props.idempotencyKey
    this._status = props.status
    this._subtotal = props.subtotal
    this._adjustmentAmount = props.adjustmentAmount
    this._total = props.total
    this._currency = props.currency
    this._items = props.items
    this._adjustments = props.adjustments
    this._createdAt = props.createdAt
    this._updatedAt = props.updatedAt
  }

  /**
   * 建立新訂單
   */
  static create(
    id: string,
    memberId: string | null = null,
    idempotencyKey?: string,
    currency = 'TWD'
  ): Order {
    return new Order(id, {
      memberId,
      idempotencyKey,
      status: OrderStatus.PENDING,
      subtotal: Money.of(0, currency),
      adjustmentAmount: Money.of(0, currency),
      total: Money.of(0, currency),
      currency,
      items: [],
      adjustments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  /**
   * 從資料庫重建訂單
   */
  static reconstitute(id: string, props: OrderProps): Order {
    return new Order(id, props)
  }

  // Getters
  get memberId(): string | null {
    return this._memberId
  }

  get idempotencyKey(): string | undefined {
    return this._idempotencyKey
  }

  get status(): OrderStatus {
    return this._status
  }

  get subtotal(): Money {
    return this._subtotal
  }

  get adjustmentAmount(): Money {
    return this._adjustmentAmount
  }

  get total(): Money {
    return this._total
  }

  get currency(): string {
    return this._currency
  }

  get items(): LineItem[] {
    return [...this._items]
  }

  get adjustments(): Adjustment[] {
    return [...this._adjustments]
  }

  get createdAt(): Date {
    return this._createdAt
  }

  get updatedAt(): Date {
    return this._updatedAt
  }

  /**
   * 新增明細項目（僅限 PENDING 狀態）
   */
  addItem(item: LineItem): void {
    if (this._status !== OrderStatus.PENDING) {
      throw CommerceError.invalidStatusTransition(this._status, 'addItem')
    }
    this._items.push(item)
    this.recalculate()
  }

  /**
   * 新增金額調整（僅限 PENDING 狀態）
   */
  addAdjustment(adjustment: Adjustment): void {
    if (this._status !== OrderStatus.PENDING) {
      throw CommerceError.invalidStatusTransition(this._status, 'addAdjustment')
    }
    this._adjustments.push(adjustment)
    this.recalculate()
  }

  /**
   * 標記為已付款
   */
  markAsPaid(): void {
    if (this._status !== OrderStatus.PENDING) {
      throw CommerceError.invalidStatusTransition(this._status, OrderStatus.PAID)
    }
    this._status = OrderStatus.PAID
    this._updatedAt = new Date()
  }

  /**
   * 標記為處理中
   */
  markAsProcessing(): void {
    if (this._status !== OrderStatus.PAID) {
      throw CommerceError.invalidStatusTransition(this._status, OrderStatus.PROCESSING)
    }
    this._status = OrderStatus.PROCESSING
    this._updatedAt = new Date()
  }

  /**
   * 標記為已出貨
   */
  markAsShipped(): void {
    if (this._status !== OrderStatus.PROCESSING) {
      throw CommerceError.invalidStatusTransition(this._status, OrderStatus.SHIPPED)
    }
    this._status = OrderStatus.SHIPPED
    this._updatedAt = new Date()
  }

  /**
   * 標記為已完成
   */
  markAsCompleted(): void {
    if (this._status !== OrderStatus.SHIPPED) {
      throw CommerceError.invalidStatusTransition(this._status, OrderStatus.COMPLETED)
    }
    this._status = OrderStatus.COMPLETED
    this._updatedAt = new Date()
  }

  /**
   * 申請退款（允許的狀態: PAID, PROCESSING, COMPLETED）
   */
  requestRefund(): void {
    const allowedStatuses = [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.COMPLETED]
    if (!allowedStatuses.includes(this._status)) {
      throw CommerceError.invalidStatusTransition(this._status, OrderStatus.REQUESTED_REFUND)
    }
    this._status = OrderStatus.REQUESTED_REFUND
    this._updatedAt = new Date()
  }

  /**
   * 標記為已退款
   */
  markAsRefunded(): void {
    if (this._status !== OrderStatus.REQUESTED_REFUND) {
      throw CommerceError.invalidStatusTransition(this._status, OrderStatus.REFUNDED)
    }
    this._status = OrderStatus.REFUNDED
    this._updatedAt = new Date()
  }

  /**
   * 取消訂單（僅限 PENDING 狀態）
   */
  cancel(): void {
    if (this._status !== OrderStatus.PENDING) {
      throw CommerceError.invalidStatusTransition(this._status, OrderStatus.CANCELLED)
    }
    this._status = OrderStatus.CANCELLED
    this._updatedAt = new Date()
  }

  /**
   * 重新計算訂單金額
   */
  private recalculate(): void {
    // 計算小計
    this._subtotal = this._items.reduce(
      (sum, item) => sum.add(item.totalPrice),
      Money.of(0, this._currency)
    )

    // 計算調整總額
    this._adjustmentAmount = this._adjustments.reduce(
      (sum, adj) => sum.add(adj.amount),
      Money.of(0, this._currency)
    )

    // 計算總額（至少為 0）
    const total = this._subtotal.add(this._adjustmentAmount)
    this._total = total.isGreaterThan(Money.of(0, this._currency))
      ? total
      : Money.of(0, this._currency)

    this._updatedAt = new Date()
  }

  /**
   * 轉換為 Props 供 Repository 保存
   */
  toProps(): OrderProps {
    return {
      memberId: this._memberId,
      idempotencyKey: this._idempotencyKey,
      status: this._status,
      subtotal: this._subtotal,
      adjustmentAmount: this._adjustmentAmount,
      total: this._total,
      currency: this._currency,
      items: this._items,
      adjustments: this._adjustments,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    }
  }
}
