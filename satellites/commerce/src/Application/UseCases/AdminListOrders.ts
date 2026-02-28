import { UseCase } from '@gravito/enterprise'
import type { IOrderRepository } from '../../Domain/Contracts/IOrderRepository'
import type { OrderDTO } from '../DTOs/OrderDTO'
import { OrderMapper } from '../DTOs/OrderMapper'

/**
 * AdminListOrders UseCase 輸入
 */
export interface AdminListOrdersInput {
  status?: string
  memberId?: string
  limit?: number
  offset?: number
}

/**
 * AdminListOrders UseCase 輸出
 */
export interface AdminListOrdersOutput {
  items: OrderDTO[]
  total: number
  limit: number
  offset: number
}

/**
 * AdminListOrders UseCase
 *
 * 管理後台查詢訂單列表（真實 DB 查詢）
 */
export class AdminListOrders extends UseCase<AdminListOrdersInput, AdminListOrdersOutput> {
  constructor(private orderRepository: IOrderRepository) {
    super()
  }

  async execute(input: AdminListOrdersInput): Promise<AdminListOrdersOutput> {
    const limit = input.limit || 20
    const offset = input.offset || 0

    const { items, total } = await this.orderRepository.findAll({
      status: input.status,
      memberId: input.memberId,
      limit,
      offset,
    })

    return {
      items: OrderMapper.toDTOList(items),
      total,
      limit,
      offset,
    }
  }
}
