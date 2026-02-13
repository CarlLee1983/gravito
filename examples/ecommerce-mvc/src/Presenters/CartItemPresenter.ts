import type { CartItem } from '../models'

/**
 * Cart Item Response DTO
 *
 * Type-safe API response for cart item data.
 */
export interface CartItemResponseDTO {
  id: number
  productId: number
  quantity: number
  price: number
  lineTotal: number
  product: {
    id: number
    name: string
    slug: string
    imageUrl: string | null
    stock: number
  }
  createdAt: string
}

/**
 * Cart Item Presenter
 *
 * Transforms CartItem model to API response.
 * Handles snake_case to camelCase conversion.
 */
export class CartItemPresenter {
  static present(item: CartItem): CartItemResponseDTO {
    if (!item.product) {
      throw new Error('CartItem product relationship not loaded')
    }

    return {
      id: item.id,
      productId: item.product_id,
      quantity: item.quantity,
      price: item.price,
      lineTotal: item.getLineTotal(),
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        imageUrl: item.product.image_url,
        stock: item.product.stock,
      },
      createdAt: item.created_at.toISOString(),
    }
  }
}
