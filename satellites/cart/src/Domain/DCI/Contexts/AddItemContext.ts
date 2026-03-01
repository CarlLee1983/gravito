import type { ICartRepository } from '../../Contracts/ICartRepository'
import { Cart } from '../../Entities/Cart'
import { injectCartOwner } from '../Roles/CartOwnerRole'

/**
 * 新增商品到購物車的上下文
 * DCI Context：協調 CartOwner Role、Cart 與 Repository
 */
export class AddItemContext {
  constructor(private repository: ICartRepository) {}

  async execute(input: {
    memberId?: string
    guestId?: string
    variantId: string
    quantity: number
  }): Promise<void> {
    // 1. 查找或建立購物車
    let cart = await this.repository.find({
      memberId: input.memberId,
      guestId: input.guestId,
    })

    if (!cart) {
      cart = Cart.create(crypto.randomUUID(), input.memberId || null, input.guestId || null)
    }

    // 2. 注入 CartOwner 角色並執行新增
    const owner = injectCartOwner(cart)
    owner.addItem(input.variantId, input.quantity)

    // 3. 持久化
    await this.repository.save(cart)
  }
}
