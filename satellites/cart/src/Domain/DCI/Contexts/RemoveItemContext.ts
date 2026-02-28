import type { ICartRepository } from '../../Contracts/ICartRepository'
import { injectCartOwner } from '../Roles/CartOwnerRole'

/**
 * 移除商品的上下文
 */
export class RemoveItemContext {
  constructor(private repository: ICartRepository) {}

  /**
   * 執行移除商品流程
   */
  async execute(input: { memberId?: string; guestId?: string; variantId: string }): Promise<void> {
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

    // 3. 執行移除
    owner.removeItem(input.variantId)

    // 4. 持久化
    await this.repository.save(cart)
  }
}
