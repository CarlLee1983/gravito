import { AggregateRoot, Entity } from '@gravito/enterprise'

export interface AdjustmentProps {
  label: string
  amount: number
  sourceType: string | null
  sourceId: string | null
}

export class Adjustment extends Entity<string> {
  constructor(
    id: string,
    public readonly props: AdjustmentProps
  ) {
    super(id)
  }
}

export interface LineItemProps {
  variantId: string
  sku: string
  name: string
  unitPrice: number
  quantity: number
  totalPrice: number
  options?: Record<string, string>
}

export class LineItem extends Entity<string> {
  constructor(
    id: string,
    public readonly props: LineItemProps
  ) {
    super(id)
  }
}

export interface OrderProps {
  memberId: string | null
  idempotencyKey?: string
  status:
    | 'pending'
    | 'paid'
    | 'processing'
    | 'shipped'
    | 'completed'
    | 'cancelled'
    | 'requested_refund'
    | 'refunded'
  subtotalAmount: number
  adjustmentAmount: number
  totalAmount: number
  currency: string
  items: LineItem[]
  adjustments: Adjustment[]
  createdAt: Date
  updatedAt?: Date
}

export class Order extends AggregateRoot<string> {
  private constructor(
    id: string,
    private readonly props: OrderProps
  ) {
    super(id)
  }

  static create(id: string, memberId: string | null = null, currency = 'TWD'): Order {
    return new Order(id, {
      memberId,
      status: 'pending',
      subtotalAmount: 0,
      adjustmentAmount: 0,
      totalAmount: 0,
      currency,
      items: [],
      adjustments: [],
      createdAt: new Date(),
    })
  }

  // Public Getters for Persistence & Logic
  get memberId() {
    return this.props.memberId
  }
  get status() {
    return this.props.status
  }
  get subtotalAmount() {
    return this.props.subtotalAmount
  }
  get adjustmentAmount() {
    return this.props.adjustmentAmount
  }
  get totalAmount() {
    return this.props.totalAmount
  }
  get createdAt() {
    return this.props.createdAt
  }
  get items() {
    return [...this.props.items]
  }
  get adjustments() {
    return [...this.props.adjustments]
  }

  public addItem(item: LineItem): void {
    if (this.props.status !== 'pending') {
      throw new Error('Order is not in pending state')
    }
    this.props.items.push(item)
    this.recalculate()
  }

  public addAdjustment(adj: Adjustment): void {
    if (this.props.status !== 'pending') {
      throw new Error('Order is not in pending state')
    }
    this.props.adjustments.push(adj)
    this.recalculate()
  }

  private recalculate(): void {
    ;(this.props as any).subtotalAmount = this.props.items.reduce(
      (sum, item) => sum + item.props.totalPrice,
      0
    )
    ;(this.props as any).adjustmentAmount = this.props.adjustments.reduce(
      (sum, adj) => sum + adj.props.amount,
      0
    )
    ;(this.props as any).totalAmount = Math.max(
      0,
      this.props.subtotalAmount + this.props.adjustmentAmount
    )
    ;(this.props as any).updatedAt = new Date()
  }

  public markAsPaid(): void {
    if (this.props.status !== 'pending') {
      throw new Error('Invalid status transition')
    }
    ;(this.props as any).status = 'paid'
    ;(this.props as any).updatedAt = new Date()
  }

  public requestRefund(): void {
    const allowedStatuses = ['paid', 'processing', 'completed']
    if (!allowedStatuses.includes(this.props.status)) {
      throw new Error(`Refund cannot be requested for order in ${this.props.status} state`)
    }
    ;(this.props as any).status = 'requested_refund'
    ;(this.props as any).updatedAt = new Date()
  }

  public markAsRefunded(): void {
    if (this.props.status !== 'requested_refund') {
      throw new Error('Order must be in requested_refund state')
    }
    ;(this.props as any).status = 'refunded'
    ;(this.props as any).updatedAt = new Date()
  }
}
