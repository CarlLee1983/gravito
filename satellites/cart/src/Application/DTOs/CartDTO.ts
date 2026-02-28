import type { Cart } from '../../Domain/Entities/Cart'

/**
 * 購物車項目 DTO
 */
export interface CartItemDTO {
  id: string
  variantId: string
  quantity: number
}

/**
 * 購物車 DTO
 */
export interface CartDTO {
  id: string
  memberId: string | null
  guestId: string | null
  items: CartItemDTO[]
  lastActivityAt: string
}

/**
 * 將 Domain Cart 轉換為 DTO
 */
export function cartToDTO(cart: Cart): CartDTO {
  return {
    id: cart.id,
    memberId: cart.memberId,
    guestId: cart.guestId,
    items: cart.items.map((item) => ({
      id: item.id,
      variantId: item.variantId,
      quantity: item.quantity,
    })),
    lastActivityAt: cart.lastActivityAt.toISOString(),
  }
}
