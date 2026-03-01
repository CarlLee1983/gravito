/**
 * Admin JWT Token 黑名單管理
 * 用於管理已登出的 token，防止重複使用
 */
export class AdminTokenBlacklist {
  private memoryBlacklist = new Set<string>()
  private expiryTimes = new Map<string, number>()

  /**
   * 將 token 加入黑名單
   */
  addToBlacklist(token: string, expiryTime: number): void {
    this.memoryBlacklist.add(token)
    this.expiryTimes.set(token, expiryTime)
  }

  /**
   * 檢查 token 是否在黑名單中
   */
  isBlacklisted(token: string): boolean {
    if (!this.memoryBlacklist.has(token)) {
      return false
    }

    // 檢查是否已過期
    const expiryTime = this.expiryTimes.get(token)
    if (expiryTime && Date.now() > expiryTime) {
      // 清理過期的 token
      this.memoryBlacklist.delete(token)
      this.expiryTimes.delete(token)
      return false
    }

    return true
  }

  /**
   * 清理所有過期的 token
   */
  cleanup(): void {
    const now = Date.now()
    const tokensToDelete: string[] = []

    for (const [token, expiryTime] of this.expiryTimes.entries()) {
      if (now > expiryTime) {
        tokensToDelete.push(token)
      }
    }

    for (const token of tokensToDelete) {
      this.memoryBlacklist.delete(token)
      this.expiryTimes.delete(token)
    }
  }

  /**
   * 取得黑名單統計
   */
  getStats(): { total: number; expired: number } {
    const now = Date.now()
    let expired = 0

    for (const expiryTime of this.expiryTimes.values()) {
      if (now > expiryTime) {
        expired += 1
      }
    }

    return {
      total: this.memoryBlacklist.size,
      expired,
    }
  }
}
