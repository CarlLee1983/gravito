import type { Admin } from '../../Domain/Entities/Admin'
import type { TokenPair } from '../../Interface/Http/Strategies/JwtAdminAuthStrategy'
import { AdminMapper } from './AdminDTO'

/**
 * 認證響應 DTO
 */
export interface AdminAuthResponseDTO {
  admin: ReturnType<typeof AdminMapper.toDTO>
  accessToken: string
  refreshToken: string
  expiresIn: number
}

/**
 * 認證響應 Mapper
 */
export class AdminAuthResponseMapper {
  static toDTO(admin: Admin, tokens: TokenPair): AdminAuthResponseDTO {
    return {
      admin: AdminMapper.toDTO(admin),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    }
  }
}
