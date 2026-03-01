import type {
  IPermissionRepository,
  PaginationOptions,
  PermissionFilters,
} from '../../Domain/Contracts/IPermissionRepository'
import { PermissionMapper } from '../DTOs/PermissionDTO'

export class ListPermissionsUseCase {
  constructor(private readonly permissionRepo: IPermissionRepository) {}

  async execute(filters: PermissionFilters, options: PaginationOptions) {
    const result = await this.permissionRepo.findWithPagination(filters, options)

    return {
      items: PermissionMapper.toDTOList(result.items),
      total: result.total,
      page: result.page,
      limit: result.limit,
    }
  }
}
