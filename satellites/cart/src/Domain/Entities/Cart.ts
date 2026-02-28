import { AggregateRoot } from '@gravito/enterprise'
import { CartItem } from './CartItem'

export interface CartProps {
  memberId: string | null
  guestId: string | null
  items: CartItem[]
  lastActivityAt: Date
}

/**
 * 購物車 Aggregate Root
 * 管理多個購物車項目，確保一致性和 immutability
 */
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

  get memberId(): string | null {
    return this.props.memberId
  }

  get guestId(): string | null {
    return this.props.guestId
  }

  get items(): CartItem[] {
    return [...this.props.items]
  }

  get lastActivityAt(): Date {
    return this.props.lastActivityAt
  }

  /**
   * 新增購物車項目或增加現有項目的數量
   * immutable：透過建立新項目或更新現有項目
   */
  public addItem(variantId: string, quantity: number): void {
    const existingIndex = this.props.items.findIndex((i) => i.variantId === variantId)
    if (existingIndex >= 0) {
      const existing = this.props.items[existingIndex]
      const updated = existing.withQuantity(existing.quantity + quantity)
      this.props.items[existingIndex] = updated
    } else {
      this.props.items.push(CartItem.create(crypto.randomUUID(), variantId, quantity))
    }
    this.updateLastActivity()
  }

  /**
   * 移除購物車項目
   */
  public removeItem(variantId: string): void {
    this.props.items = this.props.items.filter((i) => i.variantId !== variantId)
    this.updateLastActivity()
  }

  /**
   * 更新購物車項目的數量
   */
  public updateItemQuantity(variantId: string, newQuantity: number): void {
    const existingIndex = this.props.items.findIndex((i) => i.variantId === variantId)
    if (existingIndex >= 0) {
      const existing = this.props.items[existingIndex]
      const updated = existing.withQuantity(newQuantity)
      this.props.items[existingIndex] = updated
      this.updateLastActivity()
    }
  }

  /**
   * 清空購物車
   */
  public clear(): void {
    this.props.items = []
    this.updateLastActivity()
  }

  /**
   * 重新分配購物車給指定會員
   */
  public reassignToMember(memberId: string): void {
    ;(this.props as any).memberId = memberId
    ;(this.props as any).guestId = null
    this.updateLastActivity()
  }

  /**
   * 水合購物車項目列表（用於 Repository 載入資料）
   * 受保護方法：只供 Repository 使用
   */
  protected hydrateItems(items: CartItem[]): void {
    this.props.items = items
  }

  /**
   * 從另一個購物車合併項目
   */
  public merge(other: Cart): void {
    for (const item of other.items) {
      this.addItem(item.variantId, item.quantity)
    }
  }

  private updateLastActivity(): void {
    ;(this.props as any).lastActivityAt = new Date()
  }
}
