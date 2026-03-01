import type {
  AdminFilters,
  IAdminRepository,
  PaginationOptions,
} from '../../Domain/Contracts/IAdminRepository'
import { AdminMapper } from '../DTOs/AdminDTO'

export class ListAdminsUseCase {
  constructor(private readonly adminRepo: IAdminRepository) {}

  async execute(filters: AdminFilters, options: PaginationOptions) {
    const result = await this.adminRepo.findWithPagination(filters, options)

    return {
      items: AdminMapper.toDTOList(result.items),
      total: result.total,
      page: result.page,
      limit: result.limit,
    }
  }
}
