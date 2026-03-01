import type { AdminTokenBlacklist } from '../../Infrastructure/TokenBlacklist/AdminTokenBlacklist'
import type { JwtAdminAuthStrategy } from '../../Interface/Http/Strategies/JwtAdminAuthStrategy'

export class LogoutAdminUseCase {
  constructor(
    private readonly tokenBlacklist: AdminTokenBlacklist,
    private readonly jwtStrategy: JwtAdminAuthStrategy
  ) {}

  async execute(token: string): Promise<void> {
    // 解析 token 取得過期時間
    const payload = this.jwtStrategy.verifyToken(token)
    const expiryTime = payload.exp * 1000 // 轉換為 milliseconds

    // 加入黑名單
    this.tokenBlacklist.addToBlacklist(token, expiryTime)
  }
}
