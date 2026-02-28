import { UseCase } from '@gravito/enterprise'
import type { ICartRepository } from '../../Domain/Contracts/ICartRepository'
import { GetCartContext } from '../../Domain/DCI/Contexts'
import { injectCartOwner } from '../../Domain/DCI/Roles'

export interface ClearCartInput {
  memberId?: string
  guestId?: string
}

/**
 * 清空購物車 UseCase
 * 薄殼：查詢購物車後委派給 CartOwner 角色的 clear() 方法
 */
export class ClearCart extends UseCase<ClearCartInput, void> {
  private getContext: GetCartContext

  constructor(private repository: ICartRepository) {
    super()
    this.getContext = new GetCartContext(repository)
  }

  async execute(input: ClearCartInput): Promise<void> {
    // 1. 查詢購物車
    const cart = await this.getContext.execute(input)
    if (!cart) {
      // 購物車不存在，無需清空
      return
    }

    // 2. 注入角色並執行清空
    const owner = injectCartOwner(cart)
    owner.clear()

    // 3. 持久化
    await this.repository.save(cart)
  }
}
