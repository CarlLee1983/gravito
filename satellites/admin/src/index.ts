import { CreateAdminUseCase } from './Application/UseCases/CreateAdmin'
import { DeleteAdminUseCase } from './Application/UseCases/DeleteAdmin'
import { GetAdminUseCase } from './Application/UseCases/GetAdmin'
import { ListAdminsUseCase } from './Application/UseCases/ListAdmins'
import { LoginAdminUseCase } from './Application/UseCases/LoginAdmin'
import { LogoutAdminUseCase } from './Application/UseCases/LogoutAdmin'
import { RefreshAdminTokenUseCase } from './Application/UseCases/RefreshAdminToken'
import { UpdateAdminUseCase } from './Application/UseCases/UpdateAdmin'
import { Admin } from './Domain/Entities/Admin'
import { AdminEmail } from './Domain/ValueObjects/AdminEmail'
import { InMemoryAdminRepository } from './Infrastructure/Persistence/AtlasAdminRepository'
import { AdminTokenBlacklist } from './Infrastructure/TokenBlacklist/AdminTokenBlacklist'
import { AdminAuthController } from './Interface/Http/Controllers/AdminAuthController'
import { AdminController } from './Interface/Http/Controllers/AdminController'
import { adminAuthMiddleware } from './Interface/Http/Middleware/adminAuthMiddleware'
import { JwtAdminAuthStrategy } from './Interface/Http/Strategies/JwtAdminAuthStrategy'

/**
 * Admin Service Provider
 * 後台管理員系統服務提供者
 */
export class AdminServiceProvider {
  constructor(private core: any) {}

  register(): void {
    const container = this.core.container

    // Repository
    container.singleton('admin.repository', () => {
      return new InMemoryAdminRepository()
    })

    // Token Blacklist
    container.singleton('admin.tokenBlacklist', () => {
      return new AdminTokenBlacklist()
    })

    // JWT Strategy
    container.singleton('admin.jwtStrategy', () => {
      return new JwtAdminAuthStrategy()
    })

    // UseCases
    container.factory('admin.loginUseCase', () => {
      return new LoginAdminUseCase(
        container.make('admin.repository'),
        container.make('admin.jwtStrategy'),
        this.core
      )
    })

    container.factory('admin.refreshUseCase', () => {
      return new RefreshAdminTokenUseCase(container.make('admin.jwtStrategy'))
    })

    container.factory('admin.logoutUseCase', () => {
      return new LogoutAdminUseCase(
        container.make('admin.tokenBlacklist'),
        container.make('admin.jwtStrategy')
      )
    })

    container.factory('admin.listUseCase', () => {
      return new ListAdminsUseCase(container.make('admin.repository'))
    })

    container.factory('admin.getUseCase', () => {
      return new GetAdminUseCase(container.make('admin.repository'))
    })

    container.factory('admin.createUseCase', () => {
      return new CreateAdminUseCase(container.make('admin.repository'), this.core)
    })

    container.factory('admin.updateUseCase', () => {
      return new UpdateAdminUseCase(container.make('admin.repository'), this.core)
    })

    container.factory('admin.deleteUseCase', () => {
      return new DeleteAdminUseCase(container.make('admin.repository'), this.core)
    })

    // Controllers
    container.singleton('admin.authController', () => {
      return new AdminAuthController(
        container.make('admin.loginUseCase'),
        container.make('admin.refreshUseCase'),
        container.make('admin.logoutUseCase')
      )
    })

    container.singleton('admin.controller', () => {
      return new AdminController(
        container.make('admin.listUseCase'),
        container.make('admin.getUseCase'),
        container.make('admin.createUseCase'),
        container.make('admin.updateUseCase'),
        container.make('admin.deleteUseCase')
      )
    })
  }

  async boot(): Promise<void> {
    const core = this.core
    if (!core) {
      return
    }

    const router = core.container.make('router') ?? core.router
    const adminRepo = core.container.make('admin.repository')
    const jwtStrategy = core.container.make('admin.jwtStrategy')
    const authMiddleware = adminAuthMiddleware(core, jwtStrategy, adminRepo)
    const authController = core.container.make('admin.authController') as AdminAuthController
    const adminController = core.container.make('admin.controller') as AdminController

    // 認證路由（無需認證）
    router.post('/api/admin/auth/login', (ctx: any) => authController.login(ctx))
    router.post('/api/admin/auth/refresh', (ctx: any) => authController.refresh(ctx))

    // 需要認證的路由
    router.post('/api/admin/auth/logout', authMiddleware, (ctx: any) => authController.logout(ctx))
    router.get('/api/admin/auth/me', authMiddleware, (ctx: any) => authController.me(ctx))

    // Admin CRUD 路由
    router.get('/api/admin/v1/admins', authMiddleware, (ctx: any) => adminController.index(ctx))
    router.get('/api/admin/v1/admins/:id', authMiddleware, (ctx: any) => adminController.show(ctx))
    router.post('/api/admin/v1/admins', authMiddleware, (ctx: any) => adminController.store(ctx))
    router.patch('/api/admin/v1/admins/:id', authMiddleware, (ctx: any) =>
      adminController.update(ctx)
    )
    router.delete('/api/admin/v1/admins/:id', authMiddleware, (ctx: any) =>
      adminController.destroy(ctx)
    )

    // Bootstrap super admin
    await this.bootstrapSuperAdmin(adminRepo)

    // 監聽 admin 刪除事件
    core.hooks.addAction('admin:deleted', (data: any) => {
      core.hooks.doAction('admin:deleted-cascade', data)
    })
  }

  private async bootstrapSuperAdmin(adminRepo: any): Promise<void> {
    const email = process.env.ADMIN_EMAIL || 'admin@example.com'
    const password = process.env.ADMIN_PASSWORD || 'password'
    const name = process.env.ADMIN_NAME || '系統管理員'

    try {
      const existing = await adminRepo.findByEmail(email)
      if (existing) {
        return
      }

      const adminEmail = AdminEmail.create(email)
      const admin = Admin.createSuper(crypto.randomUUID(), adminEmail, name, password)
      await adminRepo.save(admin)
    } catch {
      // Bootstrap error, continue anyway
    }
  }
}

export {
  type AdminAuthResponseDTO,
  AdminAuthResponseMapper,
} from './Application/DTOs/AdminAuthResponseDTO'
export { type AdminDTO, AdminMapper } from './Application/DTOs/AdminDTO'
export { AdminError, type AdminErrorCode, AdminErrorFactory } from './Application/Errors/AdminError'
export type {
  AdminFilters,
  IAdminRepository,
  PaginatedResult,
  PaginationOptions,
} from './Domain/Contracts/IAdminRepository'
// 匯出 Domain 和 Application 層
export { Admin, type AdminProps, AdminStatus } from './Domain/Entities/Admin'
export { AdminEmail } from './Domain/ValueObjects/AdminEmail'
