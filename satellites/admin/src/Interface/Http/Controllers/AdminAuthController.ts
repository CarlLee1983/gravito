import type { GravitoContext } from '@gravito/core'
import { AdminMapper } from '../../../Application/DTOs/AdminDTO'
import type { LoginAdminUseCase } from '../../../Application/UseCases/LoginAdmin'
import type { LogoutAdminUseCase } from '../../../Application/UseCases/LogoutAdmin'
import type { RefreshAdminTokenUseCase } from '../../../Application/UseCases/RefreshAdminToken'

/**
 * Admin 認證 Controller
 */
export class AdminAuthController {
  constructor(
    private loginUseCase: LoginAdminUseCase,
    private refreshUseCase: RefreshAdminTokenUseCase,
    private logoutUseCase: LogoutAdminUseCase
  ) {}

  /**
   * POST /api/admin/auth/login
   */
  async login(ctx: GravitoContext) {
    // @ts-expect-error ctx.req.json() returns unknown
    const { email, password } = await ctx.req.json()

    const result = await this.loginUseCase.execute(email as string, password as string)
    return ctx.json(result, 200)
  }

  /**
   * POST /api/admin/auth/refresh
   */
  async refresh(ctx: GravitoContext) {
    // @ts-expect-error ctx.req.json() returns unknown
    const { refreshToken } = await ctx.req.json()

    const result = await this.refreshUseCase.execute(refreshToken as string)
    return ctx.json(result, 200)
  }

  /**
   * POST /api/admin/auth/logout
   */
  async logout(ctx: GravitoContext) {
    const token = ctx.get('adminToken') as unknown
    if (token) {
      await this.logoutUseCase.execute(token as string)
    }

    return ctx.json({ success: true }, 200)
  }

  /**
   * GET /api/admin/auth/me
   */
  async me(ctx: GravitoContext) {
    const admin = ctx.get('admin') as unknown
    if (!admin) {
      return ctx.json({ error: 'Unauthorized' }, 401)
    }

    return ctx.json(AdminMapper.toDTO(admin as any), 200)
  }
}
