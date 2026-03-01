import type { ICartRepository } from '../../Contracts/ICartRepository'
import { CartError } from '../../Errors'
import { injectCartOwner } from '../Roles/CartOwnerRole'

/**
 * 更新商品數量的上下文
 * DCI Context：協調 CartOwner Role 與 Repository
 */
export class UpdateItemContext {
  constructor(private repository: ICartRepository) {}

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
      throw CartError.cartNotFound()
    }

    // 2. 注入 CartOwner 角色並執行更新
    const owner = injectCartOwner(cart)
    owner.updateItemQuantity(input.variantId, input.quantity)

    // 3. 持久化
    await this.repository.save(cart)
  }
}
