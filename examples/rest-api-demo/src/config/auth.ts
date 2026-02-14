/**
 * Authentication Configuration
 *
 * 配置認證系統：Guard、Provider、Token 設置
 */

import type { AuthConfig } from '@gravito/sentinel'

/**
 * 認證配置
 *
 * 使用雙守衛策略：
 * - JWT: REST API 無狀態認證
 * - Session: 可選的有狀態認證（如果使用 Cookie）
 */
export const authConfig: AuthConfig = {
  defaults: {
    guard: 'jwt', // 預設使用 JWT
    passwords: 'users',
  },

  /**
   * Guards 配置：定義認證守衛
   */
  guards: {
    /**
     * JWT Guard: 用於 REST API 無狀態認證
     * - 從 Authorization Header 提取 Bearer Token
     * - 驗證簽名和過期時間
     */
    jwt: {
      driver: 'jwt',
      provider: 'users',
      secret: process.env.JWT_SECRET || 'your-secret-key',
      algorithm: 'HS256',
      expiresIn: '1h',
      refreshExpiresIn: '30d',
    },

    /**
     * Session Guard: 用於基於 Cookie 的有狀態認證
     * - 存儲用戶信息在會話中
     * - 適用於傳統 Web 應用
     */
    session: {
      driver: 'session',
      provider: 'users',
    },

    /**
     * Token Guard: 用於 API Token 認證
     * - 檢查 X-API-Token header
     * - 支持查詢參數 token
     */
    token: {
      driver: 'token',
      provider: 'users',
      allowQueryToken: true,
    },
  },

  /**
   * Providers 配置：定義用戶提供者
   */
  providers: {
    users: {
      driver: 'callback',
    },
  },
}
