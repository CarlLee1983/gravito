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
    // Ensure product data exists (use fallback for backward compatibility)
    const product = item.product || {
      id: item.product_id,
      name: 'Unknown Product',
      slug: '',
      image_url: null,
      stock: 0,
    }

    return {
      id: item.id,
      productId: item.product_id,
      quantity: item.quantity,
      price: item.price,
      lineTotal: item.getLineTotal(),
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        imageUrl: product.image_url,
        stock: product.stock,
      },
      createdAt: item.created_at.toISOString(),
    }
  }
}
