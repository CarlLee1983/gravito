import type { ICartRepository } from '../../Contracts/ICartRepository'
import { Cart } from '../../Entities/Cart'
import { injectCartOwner } from '../Roles/CartOwnerRole'

/**
 * 新增商品到購物車的上下文
 * DCI Context：協調 Cart 與 Repository
 */
export class AddItemContext {
  constructor(private repository: ICartRepository) {}

  /**
   * 執行新增商品流程
   * 1. 查找或建立購物車
   * 2. 注入 CartOwner 角色
   * 3. 執行 addItem
   * 4. 持久化
   */
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

    // 2. 注入 CartOwner 角色
    const owner = injectCartOwner(cart)

    // 3. 執行角色方法
    owner.addItem(input.variantId, input.quantity)

    // 4. 持久化
    await this.repository.save(cart)
  }
}
