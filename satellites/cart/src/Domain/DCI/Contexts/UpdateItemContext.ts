import type { ICartRepository } from '../../Contracts/ICartRepository'
import { injectCartOwner } from '../Roles/CartOwnerRole'

/**
 * 更新商品數量的上下文
 */
export class UpdateItemContext {
  constructor(private repository: ICartRepository) {}

  /**
   * 執行更新數量流程
   */
  async execute(input: {
    memberId?: string
    guestId?: string
    variantId: string
    quantity: number
  }): Promise<void> {
    // 1. 查找購物車
    const cart = await this.repository.find({
      memberId: input.memberId,
      guestId: input.guestId,
    })

    if (!cart) {
      throw new Error('購物車未找到')
    }

    // 2. 注入 CartOwner 角色
    const owner = injectCartOwner(cart)

    // 3. 執行更新
    owner.updateItemQuantity(input.variantId, input.quantity)

    // 4. 持久化
    await this.repository.save(cart)
  }
}
