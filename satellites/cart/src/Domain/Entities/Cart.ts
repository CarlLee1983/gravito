import { AggregateRoot, Entity } from '@gravito/enterprise'

export interface CartItemProps {
  variantId: string
  quantity: number
}

export class CartItem extends Entity<string> {
  constructor(
    id: string,
    public readonly props: CartItemProps
  ) {
    super(id)
  }

  public addQuantity(qty: number): void {
    ;(this.props as any).quantity += qty
  }
}

export interface CartProps {
  memberId: string | null
  guestId: string | null
  items: CartItem[]
  lastActivityAt: Date
}

export class Cart extends AggregateRoot<string> {
  private constructor(
    id: string,
    private readonly props: CartProps
  ) {
    super(id)
  }

  static create(id: string, memberId: string | null = null, guestId: string | null = null): Cart {
    return new Cart(id, {
      memberId,
      guestId,
      items: [],
      lastActivityAt: new Date(),
    })
  }

  get memberId() {
    return this.props.memberId
  }
  get guestId() {
    return this.props.guestId
  }
  get items() {
    return [...this.props.items]
  }
  get lastActivityAt() {
    return this.props.lastActivityAt
  }

  public addItem(variantId: string, quantity: number): void {
    const existing = this.props.items.find((i) => i.props.variantId === variantId)
    if (existing) {
      existing.addQuantity(quantity)
    } else {
      this.props.items.push(new CartItem(crypto.randomUUID(), { variantId, quantity }))
    }
    ;(this.props as any).lastActivityAt = new Date()
  }

  public _hydrateItem(item: CartItem): void {
    this.props.items.push(item)
  }

  public merge(other: Cart): void {
    for (const item of other.items) {
      this.addItem(item.props.variantId, item.props.quantity)
    }
    ;(this.props as any).lastActivityAt = new Date()
  }
}
