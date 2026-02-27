import type { MemberDTO } from './MemberDTO'

/**
 * 認證回應 DTO
 * 支援 JWT 與 Session 雙模式
 */
export interface AuthResponseDTO {
  member: MemberDTO
  accessToken?: string // JWT 模式
  refreshToken?: string // JWT 模式
  sessionId?: string // Session 模式（除錯用）
  expiresIn?: number // JWT accessToken 有效秒數
}
