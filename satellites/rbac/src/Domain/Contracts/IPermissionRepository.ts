import type { Permission } from '../Entities/Permission'
import type { PermissionKey } from '../ValueObjects/PermissionKey'

export interface PermissionFilters {
  groupName?: string
  isSystem?: boolean
}

export interface PaginationOptions {
  page: number
  limit: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

export interface IPermissionRepository {
  save(permission: Permission): Promise<void>
  findById(id: string): Promise<Permission | null>
  findByKey(key: PermissionKey): Promise<Permission | null>
  findByKeys(keys: PermissionKey[]): Promise<Permission[]>
  findByGroup(groupName: string): Promise<Permission[]>
  findWithPagination(
    filters: PermissionFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Permission>>
  findAll(): Promise<Permission[]>
  delete(id: string): Promise<void>
  exists(key: PermissionKey): Promise<boolean>
}
