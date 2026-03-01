import type { Role } from '../Entities/Role'

export interface RoleFilters {
  isSystem?: boolean
  search?: string
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

export interface IRoleRepository {
  save(role: Role): Promise<void>
  findById(id: string): Promise<Role | null>
  findByName(name: string): Promise<Role | null>
  findWithPagination(
    filters: RoleFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Role>>
  findAll(): Promise<Role[]>
  delete(id: string): Promise<void>
  exists(name: string): Promise<boolean>
}
