import { UseCase } from '@gravito/enterprise'
import type { ICartRepository } from '../../Domain/Contracts/ICartRepository'
import { GetCartContext } from '../../Domain/DCI/Contexts'
import { type CartDTO, cartToDTO } from '../DTOs/CartDTO'

export interface GetCartInput {
  memberId?: string
  guestId?: string
}

/**
 * 查詢購物車 UseCase
 * 薄殼：委派給 GetCartContext，並轉換為 DTO
 */
export class GetCart extends UseCase<GetCartInput, CartDTO | null> {
  private context: GetCartContext

  constructor(repository: ICartRepository) {
    super()
    this.context = new GetCartContext(repository)
  }

  async execute(input: GetCartInput): Promise<CartDTO | null> {
    const cart = await this.context.execute(input)
    return cart ? cartToDTO(cart) : null
  }
}
