import type {
  IRoleRepository,
  PaginationOptions,
  RoleFilters,
} from '../../Domain/Contracts/IRoleRepository'
import { RoleMapper } from '../DTOs/RoleDTO'

export class ListRolesUseCase {
  constructor(private readonly roleRepo: IRoleRepository) {}

  async execute(filters: RoleFilters, options: PaginationOptions) {
    const result = await this.roleRepo.findWithPagination(filters, options)

    return {
      items: RoleMapper.toDTOList(result.items),
      total: result.total,
      page: result.page,
      limit: result.limit,
    }
  }
}
