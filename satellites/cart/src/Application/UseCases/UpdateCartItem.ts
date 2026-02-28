import { UseCase } from '@gravito/enterprise'
import type { ICartRepository } from '../../Domain/Contracts/ICartRepository'
import { UpdateItemContext } from '../../Domain/DCI/Contexts'
import { CartNotFoundError, InvalidQuantityError } from '../Errors/CartError'

export interface UpdateCartItemInput {
  memberId?: string
  guestId?: string
  variantId: string
  quantity: number
}

/**
 * 更新購物車商品數量 UseCase
 * 薄殼：委派給 UpdateItemContext 執行業務邏輯
 */
export class UpdateCartItem extends UseCase<UpdateCartItemInput, void> {
  private context: UpdateItemContext

  constructor(repository: ICartRepository) {
    super()
    this.context = new UpdateItemContext(repository)
  }

  async execute(input: UpdateCartItemInput): Promise<void> {
    try {
      await this.context.execute(input)
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('未找到')) {
          throw new CartNotFoundError()
        }
        if (error.message.includes('整數') || error.message.includes('大於')) {
          throw new InvalidQuantityError(input.quantity, error.message)
        }
      }
      throw error
    }
  }
}
