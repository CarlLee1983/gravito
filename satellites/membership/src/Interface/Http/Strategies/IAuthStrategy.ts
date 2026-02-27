import type { GravitoContext } from '@gravito/core'
import type { Member } from '../../../Domain/Entities/Member'

/**
 * 認證策略統一接口
 * 支援多種認證方式：JWT、Session 等
 */
export interface IAuthStrategy {
  /**
   * 發行認證憑證
   * JWT 模式：發行 accessToken + refreshToken
   * Session 模式：設定 session 並回傳 sessionId
   */
  issueCredentials(member: Member, c: GravitoContext): Promise<AuthTokens>

  /**
   * 撤銷認證憑證
   * JWT 模式：前端負責刪除 token（無狀態）
   * Session 模式：清除 session
   */
  revokeCredentials(c: GravitoContext): Promise<void>

  /**
   * 取得認證的會員
   * JWT 模式：解析 Authorization Bearer header
   * Session 模式：取得 session 中的會員
   */
  getAuthenticatedMember(c: GravitoContext): Promise<Member | null>
}

/**
 * 認證回傳的憑證
 */
export interface AuthTokens {
  accessToken?: string
  refreshToken?: string
  sessionId?: string
  expiresIn?: number // accessToken 有效秒數
}
