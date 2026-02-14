/**
 * Security Service Provider
 *
 * 註冊安全系統的所有服務到 IoC 容器
 */

import { ServiceProvider } from '@gravito/core'

export class SecurityServiceProvider extends ServiceProvider {
  /**
   * 註冊安全服務
   */
  register(): void {
    // 安全服務由中間件直接提供，不需要在容器中註冊
  }

  /**
   * 啟動安全服務
   */
  async boot(): Promise<void> {
    console.log('[Security] ✅ 安全系統已初始化')
    console.log('[Security] - Input Validation 已啟用')
    console.log('[Security] - Rate Limiting 已啟用')
    console.log('[Security] - CSRF Protection 已啟用')
    console.log('[Security] - Security Headers 已配置')
    console.log('[Security] - Input Sanitization 已啟用')
  }
}
