/**
 * Cart Service
 *
 * Business logic for shopping cart operations.
 */

import { DB } from '@gravito/atlas'
import { Cart, CartItem } from '../models'
import { sql, TRUE } from '../utils/db'

export class CartService {
  /**
   * Get or create cart for user/session
   */
  async getOrCreateCart(userId?: number, sessionId?: string): Promise<Cart> {
    // Try to find existing cart
    let cartRow: any = null

    if (userId) {
      const result = await DB.raw(sql('SELECT * FROM carts WHERE user_id = ?'), [userId])
      cartRow = result.rows[0]
    } else if (sessionId) {
      const result = await DB.raw(sql('SELECT * FROM carts WHERE session_id = ?'), [sessionId])
      cartRow = result.rows[0]
    }

    if (cartRow) {
      const cart = Cart.hydrate(cartRow)
      cart.items = await this.getCartItems(cart.id)
      return cart
    }

    // Create new cart
    const insertResult = await DB.raw<{ id: number }>(
      sql('INSERT INTO carts (user_id, session_id) VALUES (?, ?) RETURNING id'),
      [userId || null, sessionId || null]
    )

    const cart = new Cart()
    cart.id = insertResult.rows[0]?.id
    cart.user_id = userId || null
    cart.session_id = sessionId || null
    cart.items = []

    return cart
  }

  /**
   * Get cart items with product details
   */
  async getCartItems(cartId: number): Promise<CartItem[]> {
    const result = await DB.raw(
      sql(`
      SELECT ci.*, p.name as product_name, p.slug as product_slug, 
             p.image_url as product_image, p.stock as product_stock
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = ?
    `),
      [cartId]
    )

    return result.rows.map((row: any) => {
      const item = CartItem.hydrate(row)
      item.product = {
        id: row.product_id,
        name: row.product_name,
        slug: row.product_slug,
        image_url: row.product_image,
        stock: row.product_stock,
      }
      return item
    })
  }

  /**
   * Add item to cart
   */
  async addItem(cartId: number, productId: number, quantity = 1): Promise<CartItem> {
    // Get product and validate
    const productResult = await DB.raw(
      sql(`SELECT * FROM products WHERE id = ? AND is_active = ${TRUE}`),
      [productId]
    )
    const product = productResult.rows[0] as
      | { id: number; stock: number; price: number }
      | undefined
    if (!product) {
      throw new Error('Product not found or unavailable')
    }
    if (product.stock < quantity) {
      throw new Error('Insufficient stock')
    }

    // Check if item already in cart
    const existingResult = await DB.raw(
      sql('SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?'),
      [cartId, productId]
    )
    const existingItem = existingResult.rows[0] as { id: number; quantity: number } | undefined

    if (existingItem) {
      // Update quantity
      const newQty = (existingItem.quantity as number) + quantity
      if (product.stock < newQty) {
        throw new Error('Insufficient stock')
      }
      await DB.raw(sql('UPDATE cart_items SET quantity = ? WHERE id = ?'), [
        newQty,
        existingItem.id,
      ])
      const item = CartItem.hydrate({ ...existingItem, quantity: newQty })
      return item
    }

    // Add new item
    const insertResult = await DB.raw<{ id: number }>(
      sql(
        'INSERT INTO cart_items (cart_id, product_id, quantity, price) VALUES (?, ?, ?, ?) RETURNING id'
      ),
      [cartId, productId, quantity, product.price]
    )

    const item = new CartItem()
    item.id = insertResult.rows[0]?.id
    item.cart_id = cartId
    item.product_id = productId
    item.quantity = quantity
    item.price = product.price

    // Update cart timestamp
    await DB.raw(sql('UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'), [cartId])

    return item
  }

  /**
   * Update item quantity
   */
  async updateItemQuantity(itemId: number, quantity: number): Promise<void> {
    if (quantity < 1) {
      await this.removeItem(itemId)
      return
    }

    const itemResult = await DB.raw(sql('SELECT * FROM cart_items WHERE id = ?'), [itemId])
    const item = itemResult.rows[0] as
      | { id: number; product_id: number; cart_id: number }
      | undefined
    if (!item) {
      throw new Error('Cart item not found')
    }

    const productResult = await DB.raw(sql('SELECT stock FROM products WHERE id = ?'), [
      item.product_id,
    ])
    const product = productResult.rows[0] as { stock: number } | undefined
    if (!product || product.stock < quantity) {
      throw new Error('Insufficient stock')
    }

    await DB.raw(sql('UPDATE cart_items SET quantity = ? WHERE id = ?'), [quantity, itemId])
    await DB.raw(sql('UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'), [
      item.cart_id,
    ])
  }

  /**
   * Remove item from cart
   */
  async removeItem(itemId: number): Promise<void> {
    const itemResult = await DB.raw(sql('SELECT cart_id FROM cart_items WHERE id = ?'), [itemId])
    const item = itemResult.rows[0]
    await DB.raw(sql('DELETE FROM cart_items WHERE id = ?'), [itemId])
    if (item) {
      await DB.raw(sql('UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'), [
        item.cart_id,
      ])
    }
  }

  /**
   * Clear cart
   */
  async clearCart(cartId: number): Promise<void> {
    await DB.raw(sql('DELETE FROM cart_items WHERE cart_id = ?'), [cartId])
    await DB.raw(sql('UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'), [cartId])
  }

  /**
   * Merge guest cart with user cart after login
   */
  async mergeCarts(guestSessionId: string, userId: number): Promise<Cart> {
    const guestResult = await DB.raw(sql('SELECT * FROM carts WHERE session_id = ?'), [
      guestSessionId,
    ])
    const guestCart = guestResult.rows[0]
    const userCart = await this.getOrCreateCart(userId)

    if (!guestCart) {
      return userCart
    }

    // Get guest cart items
    const guestItemsResult = await DB.raw(sql('SELECT * FROM cart_items WHERE cart_id = ?'), [
      guestCart.id,
    ])

    // Merge items
    for (const item of guestItemsResult.rows as any[]) {
      try {
        await this.addItem(userCart.id, item.product_id, item.quantity)
      } catch (_e) {
        // Skip if product unavailable or out of stock
      }
    }

    // Delete guest cart and items
    await DB.raw(sql('DELETE FROM cart_items WHERE cart_id = ?'), [guestCart.id])
    await DB.raw(sql('DELETE FROM carts WHERE id = ?'), [guestCart.id])

    // Return updated user cart
    return this.getOrCreateCart(userId)
  }
}
