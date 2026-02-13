import { DB, ModelRepository } from '@gravito/atlas'
import { Cart, CartItem } from '../models'
import { sql, TRUE } from '../utils/db'

/**
 * Cart Repository
 *
 * Handles all cart-related database operations.
 */
export class CartRepository extends ModelRepository<Cart> {
  protected modelClass = Cart

  /**
   * Get or create cart for user ID
   */
  async getOrCreateForUser(userId: number): Promise<Cart> {
    let cart = await this.findWhere('user_id', userId)
    if (!cart) {
      cart = await this.create({ user_id: userId } as any)
    }
    // Load items
    cart.items = await this.getCartItems(cart.id)
    return cart
  }

  /**
   * Get or create cart for session ID (guest)
   */
  async getOrCreateForSession(sessionId: string): Promise<Cart> {
    let cart = await this.findWhere('session_id', sessionId)
    if (!cart) {
      cart = await this.create({ session_id: sessionId } as any)
    }
    // Load items
    cart.items = await this.getCartItems(cart.id)
    return cart
  }

  /**
   * Get or create cart (user or session)
   */
  async getOrCreate(userId?: number, sessionId?: string): Promise<Cart> {
    if (userId) {
      return this.getOrCreateForUser(userId)
    }
    if (sessionId) {
      return this.getOrCreateForSession(sessionId)
    }
    // Create anonymous cart
    const cart = await this.create({} as any)
    cart.items = []
    return cart
  }

  /**
   * Get cart with items
   */
  async getWithItems(cartId: number): Promise<Cart | null> {
    const cart = await this.find(cartId)
    if (cart) {
      cart.items = await this.getCartItems(cartId)
    }
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
    const product = productResult.rows[0] as any
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
      // Attach product data to the item for event dispatch
      item.product = {
        id: product.id,
        name: product.name,
        slug: product.slug,
        image_url: product.image_url,
        stock: product.stock,
      } as any
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
    // Attach product data to the item for event dispatch
    item.product = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      image_url: product.image_url,
      stock: product.stock,
    } as any

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
   * Clear cart (remove all items)
   */
  async clearCart(cartId: number): Promise<void> {
    await DB.raw(sql('DELETE FROM cart_items WHERE cart_id = ?'), [cartId])
    await DB.raw(sql('UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'), [cartId])
  }

  /**
   * Merge guest cart with user cart after login
   */
  async mergeCarts(guestSessionId: string, userId: number): Promise<Cart> {
    const guestCart = await this.findWhere('session_id', guestSessionId)
    const userCart = await this.getOrCreateForUser(userId)

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
    await this.delete(guestCart.id)

    // Return updated user cart
    return this.getOrCreateForUser(userId)
  }
}
