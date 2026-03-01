import type { ICartRepository } from '../../Contracts/ICartRepository'
import { CartError } from '../../Errors'
import { injectCartOwner } from '../Roles/CartOwnerRole'

/**
 * 移除商品的上下文
 * DCI Context：協調 CartOwner Role 與 Repository
 */
export class RemoveItemContext {
  constructor(private repository: ICartRepository) {}

  async execute(input: { memberId?: string; guestId?: string; variantId: string }): Promise<void> {
    // 1. 查找購物車
    const cart = await this.repository.find({
      memberId: input.memberId,
      guestId: input.guestId,
    })

    if (!cart) {
      throw CartError.cartNotFound()
    }

    // 2. 注入 CartOwner 角色並執行移除
    const owner = injectCartOwner(cart)
    owner.removeItem(input.variantId)

    // 3. 持久化
    await this.repository.save(cart)
  }
}
