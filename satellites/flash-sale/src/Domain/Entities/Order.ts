import { AggregateRoot } from '@gravito/enterprise'
import { FlashSaleError, FlashSaleErrorCode } from '../../Application/Errors/FlashSaleError'
import { OrderConfirmed } from '../Events/OrderConfirmed'
import { OrderCreated } from '../Events/OrderCreated'
import { OrderStatus } from '../Models'
import type { Money } from '../ValueObjects/Money'
import type { OrderItem } from '../ValueObjects/OrderItem'

/**
 * Order 屬性介面（用於從 DB 重建）
 */
export interface OrderProps {
  userId: string
  items: OrderItem[]
  totalAmount: Money
  status: OrderStatus
  createdAt: Date
}

/**
 * Order Aggregate Root
 *
 * 訂單聚合根，管理訂單狀態機和領域事件。
 */
export class Order extends AggregateRoot<string> {
  private _userId: string
  private _items: OrderItem[]
  private _totalAmount: Money
  private _status: OrderStatus
  private _createdAt: Date

  private constructor(id: string, props: OrderProps) {
    super(id)
    this._userId = props.userId
    this._items = [...props.items]
    this._totalAmount = props.totalAmount
    this._status = props.status
    this._createdAt = props.createdAt
  }

  /**
   * 建立新訂單
   *
   * 自動計算 totalAmount 並添加 OrderCreated Domain Event。
   */
  static create(id: string, userId: string, items: OrderItem[]): Order {
    if (!userId || userId.trim() === '') {
      throw new FlashSaleError('User ID is required', FlashSaleErrorCode.INVALID_QUANTITY, 400)
    }
    if (!items || items.length === 0) {
      throw new FlashSaleError(
        'Order must have at least one item',
        FlashSaleErrorCode.INVALID_QUANTITY,
        400
      )
    }

    // 計算 totalAmount：所有 items 的 totalPrice 之和
    const totalAmount = items.reduce(
      (sum, item) => sum.add(item.totalPrice),
      items[0].totalPrice.multiply(0) // 以零為初始值，保留通貨
    )

    const order = new Order(id, {
      userId,
      items,
      totalAmount,
      status: OrderStatus.PENDING,
      createdAt: new Date(),
    })

    order.addDomainEvent(new OrderCreated(order))

    return order
  }

  /**
   * 從資料庫重建 Order（不產生 Domain Event）
   */
  static reconstitute(id: string, props: OrderProps): Order {
    return new Order(id, props)
  }

  /**
   * 轉換為已確認狀態
   *
   * DCI 設計：簡單的狀態轉換，驗證由 Role 層負責
   */
  transitionToConfirmed(): void {
    this._status = OrderStatus.CONFIRMED
    this.addDomainEvent(new OrderConfirmed(this._id))
  }

  /**
   * 轉換為已付款狀態
   *
   * DCI 設計：簡單的狀態轉換，驗證由 Role 層負責
   */
  transitionToPaid(): void {
    this._status = OrderStatus.PAID
  }

  /**
   * 轉換為已取消狀態
   *
   * DCI 設計：簡單的狀態轉換，驗證由 Role 層負責
   */
  transitionToCancelled(): void {
    this._status = OrderStatus.CANCELLED
  }

  get userId(): string {
    return this._userId
  }

  get items(): OrderItem[] {
    return [...this._items]
  }

  get totalAmount(): Money {
    return this._totalAmount
  }

  get status(): OrderStatus {
    return this._status
  }

  get createdAt(): Date {
    return this._createdAt
  }
}
