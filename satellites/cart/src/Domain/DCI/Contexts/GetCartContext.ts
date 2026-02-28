import type { ICartRepository } from '../../Contracts/ICartRepository'
import type { Cart } from '../../Entities/Cart'

/**
 * 查詢購物車的上下文
 */
export class GetCartContext {
  constructor(private repository: ICartRepository) {}

  /**
   * 執行查詢購物車流程
   * 返回購物車，如果不存在則返回 null
   */
  async execute(input: { memberId?: string; guestId?: string }): Promise<Cart | null> {
    // 直接查詢，不自動建立
    const cart = await this.repository.find({
      memberId: input.memberId,
      guestId: input.guestId,
    })

    return cart || null
  }
}
