import { AggregateRoot } from '@gravito/enterprise'
import type { CartItem } from './CartItem'

export interface CartProps {
  memberId: string | null
  guestId: string | null
  items: CartItem[]
  lastActivityAt: Date
}

/**
 * 購物車 Aggregate Root
 * 管理多個購物車項目，確保一致性和 immutability
 * DCI 模式：Entity 只提供簡單 getter/setter，業務邏輯在 Role 層
 */
export class Cart extends AggregateRoot<string> {
  private constructor(
    id: string,
    private props: CartProps
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

  static reconstitute(id: string, props: CartProps): Cart {
    return new Cart(id, { ...props })
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

  get propsObject(): CartProps {
    return {
      memberId: this.props.memberId,
      guestId: this.props.guestId,
      items: [...this.props.items],
      lastActivityAt: this.props.lastActivityAt,
    }
  }

  /**
   * 設置購物車項目列表
   * Role 層使用此方法更新購物車
   */
  public setItems(items: CartItem[]): void {
    this.props.items = [...items]
    this.updateLastActivity()
  }

  /**
   * 設置會員 ID
   */
  public setMemberId(memberId: string | null): void {
    this.props.memberId = memberId
    this.updateLastActivity()
  }

  /**
   * 設置訪客 ID
   */
  public setGuestId(guestId: string | null): void {
    this.props.guestId = guestId
    this.updateLastActivity()
  }

  /**
   * 水合購物車項目列表（用於 Repository 載入資料）
   * 受保護方法：只供 Repository 使用
   */
  protected hydrateItems(items: CartItem[]): void {
    this.props.items = items
  }

  private updateLastActivity(): void {
    this.props.lastActivityAt = new Date()
  }
}
