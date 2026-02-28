import { UseCase } from '@gravito/enterprise'
import type { ICartRepository } from '../../Domain/Contracts/ICartRepository'
import { RemoveItemContext } from '../../Domain/DCI/Contexts'
import { CartNotFoundError } from '../Errors/CartError'

export interface RemoveFromCartInput {
  memberId?: string
  guestId?: string
  variantId: string
}

/**
 * 從購物車移除商品 UseCase
 * 薄殼：委派給 RemoveItemContext 執行業務邏輯
 */
export class RemoveFromCart extends UseCase<RemoveFromCartInput, void> {
  private context: RemoveItemContext

  constructor(private repository: ICartRepository) {
    super()
    this.context = new RemoveItemContext(repository)
  }

  async execute(input: RemoveFromCartInput): Promise<void> {
    try {
      await this.context.execute(input)
    } catch (error) {
      if (error instanceof Error && error.message.includes('未找到')) {
        throw new CartNotFoundError()
      }
      throw error
    }
  }
}
