import { UseCase } from '@gravito/enterprise'
import type { ICartRepository } from '../../Domain/Contracts/ICartRepository'
import { MergeCartContext } from '../../Domain/DCI/Contexts'

export interface MergeCartInput {
  memberId: string
  guestId: string
}

/**
 * 合併購物車 UseCase
 * 薄殼：委派給 MergeCartContext 執行業務邏輯
 * 移除了之前的 `as any` hack，改用 DCI Context
 */
export class MergeCart extends UseCase<MergeCartInput, void> {
  private context: MergeCartContext

  constructor(private repository: ICartRepository) {
    super()
    this.context = new MergeCartContext(repository)
  }

  async execute(input: MergeCartInput): Promise<void> {
    await this.context.execute(input)
  }
}
