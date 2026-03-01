import type { Admin } from '../Entities/Admin'

export interface AdminFilters {
  status?: string
  isSuper?: boolean
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

export interface IAdminRepository {
  save(admin: Admin): Promise<void>
  findById(id: string): Promise<Admin | null>
  findByEmail(email: string): Promise<Admin | null>
  findByPasswordResetToken(token: string): Promise<Admin | null>
  findWithPagination(
    filters: AdminFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Admin>>
  delete(id: string): Promise<void>
  exists(email: string): Promise<boolean>
}
