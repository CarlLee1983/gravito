import { Entity } from '@gravito/enterprise'
import { CartItemQuantity } from '../ValueObjects/CartItemQuantity'

export interface CartItemProps {
  variantId: string
  quantity: number
}

/**
 * 購物車項目 Entity
 * 每一個購物車項目代表一個變體及其數量
 */
export class CartItem extends Entity<string> {
  constructor(
    id: string,
    public readonly props: CartItemProps
  ) {
    super(id)
  }

  static create(id: string, variantId: string, quantity: number): CartItem {
    // 驗證數量，確保 ValueObject 規則被遵守
    CartItemQuantity.create(quantity)
    return new CartItem(id, { variantId, quantity })
  }

  get variantId(): string {
    return this.props.variantId
  }

  get quantity(): number {
    return this.props.quantity
  }

  /**
   * 回傳新的 CartItem，具有更新後的數量
   * immutable 操作：不修改當前物件
   */
  public withQuantity(newQuantity: number): CartItem {
    CartItemQuantity.create(newQuantity)
    return new CartItem(this.id, {
      variantId: this.props.variantId,
      quantity: newQuantity,
    })
  }
}
