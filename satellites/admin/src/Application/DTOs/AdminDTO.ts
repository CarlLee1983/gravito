import type { Admin } from '../../Domain/Entities/Admin'

/**
 * Admin 資料傳輸對象（DTO）
 * 用於 API 響應，不洩漏敏感資訊如 passwordHash
 */
export interface AdminDTO {
  id: string
  email: string
  name: string
  status: string
  isSuper: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt?: string
}

/**
 * Admin DTO Mapper
 * 從 Domain Entity 轉換為 DTO
 */
export class AdminMapper {
  static toDTO(admin: Admin): AdminDTO {
    return {
      id: admin.id,
      email: admin.email.value,
      name: admin.name,
      status: admin.status,
      isSuper: admin.isSuper,
      lastLoginAt: admin.lastLoginAt?.toISOString(),
      createdAt: admin.createdAt.toISOString(),
      updatedAt: admin.updatedAt?.toISOString(),
    }
  }

  static toDTOList(admins: Admin[]): AdminDTO[] {
    return admins.map((admin) => this.toDTO(admin))
  }
}
