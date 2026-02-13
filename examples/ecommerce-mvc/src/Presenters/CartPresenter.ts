import type { Cart, CartItem } from '../models'
import { CartItemPresenter, type CartItemResponseDTO } from './CartItemPresenter'

/**
 * Cart Response DTO
 *
 * Type-safe API response for cart data.
 * Separates persistence model from API contract.
 */
export interface CartResponseDTO {
  id: number
  userId: number | null
  itemCount: number
  subtotal: number
  createdAt: string
  updatedAt: string
  items: CartItemResponseDTO[]
}

/**
 * Cart Presenter
 *
 * Transforms Cart model to API response.
 */
export class CartPresenter {
  static present(cart: Cart): CartResponseDTO {
    return {
      id: cart.id,
      userId: cart.user_id,
      itemCount: cart.getItemCount(),
      subtotal: cart.getSubtotal(),
      createdAt: cart.created_at.toISOString(),
      updatedAt: cart.updated_at.toISOString(),
      items: this.presentItems(cart.items ?? []),
    }
  }

  /**
   * Present cart with batch-loaded products
   * Enables single-query product enrichment for multiple items
   */
  static presentWithProducts(
    cart: Cart,
    productsMap: Map<
      number,
      { id: number; name: string; slug: string; image_url: string | null; stock: number }
    >
  ): CartResponseDTO {
    return {
      id: cart.id,
      userId: cart.user_id,
      itemCount: cart.getItemCount(),
      subtotal: cart.getSubtotal(),
      createdAt: cart.created_at.toISOString(),
      updatedAt: cart.updated_at.toISOString(),
      items: this.presentItemsWithProducts(cart.items ?? [], productsMap),
    }
  }

  private static presentItems(items: CartItem[]): CartItemResponseDTO[] {
    return items.map((item) => CartItemPresenter.present(item))
  }

  private static presentItemsWithProducts(
    items: CartItem[],
    productsMap: Map<
      number,
      { id: number; name: string; slug: string; image_url: string | null; stock: number }
    >
  ): CartItemResponseDTO[] {
    return items.map((item) => {
      const product = productsMap.get(item.product_id)
      if (product) {
        item.product = product
      }
      return CartItemPresenter.present(item)
    })
  }
}

// Type export for convenience
export type { CartItemResponseDTO } from './CartItemPresenter'
