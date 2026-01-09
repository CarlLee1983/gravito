import type { Cart } from '../Entities/Cart'

export interface ICartRepository {
  /**
   * 透過會員 ID 或 訪客 ID 尋找購物車
   */
  find(id: { memberId?: string; guestId?: string }): Promise<Cart | null>

  /**
   * 儲存購物車狀態
   */
  save(cart: Cart): Promise<void>

  /**
   * 刪除購物車
   */
  delete(id: string): Promise<void>
}
