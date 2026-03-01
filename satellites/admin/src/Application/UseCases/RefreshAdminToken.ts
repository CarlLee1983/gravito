import type { JwtAdminAuthStrategy } from '../../Interface/Http/Strategies/JwtAdminAuthStrategy'

export class RefreshAdminTokenUseCase {
  constructor(private readonly jwtStrategy: JwtAdminAuthStrategy) {}

  async execute(refreshToken: string): Promise<{ accessToken: string }> {
    const accessToken = this.jwtStrategy.refreshAccessToken(refreshToken)
    return { accessToken }
  }
}
