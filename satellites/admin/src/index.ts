import type { ServiceProvider } from '@gravito/core'
import type { Router } from 'hono'
import { CreateAdminUseCase } from './Application/UseCases/CreateAdmin'
import { DeleteAdminUseCase } from './Application/UseCases/DeleteAdmin'
import { GetAdminUseCase } from './Application/UseCases/GetAdmin'
import { ListAdminsUseCase } from './Application/UseCases/ListAdmins'
// UseCases
import { LoginAdminUseCase } from './Application/UseCases/LoginAdmin'
import { LogoutAdminUseCase } from './Application/UseCases/LogoutAdmin'
import { RefreshAdminTokenUseCase } from './Application/UseCases/RefreshAdminToken'
import { UpdateAdminUseCase } from './Application/UseCases/UpdateAdmin'
// Domain
import { Admin, AdminStatus } from './Domain/Entities/Admin'
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
export class AdminServiceProvider implements ServiceProvider {
  constructor(private readonly core: any) {}

  register(): void {
    // Repository
    this.core.container.singleton('admin.repository', () => {
      return new InMemoryAdminRepository()
    })

    // Token Blacklist
    this.core.container.singleton('admin.tokenBlacklist', () => {
      return new AdminTokenBlacklist()
    })

    // JWT Strategy
    this.core.container.singleton('admin.jwtStrategy', () => {
      return new JwtAdminAuthStrategy()
    })

    // UseCases
    this.core.container.factory('admin.loginUseCase', (container: any) => {
      return new LoginAdminUseCase(
        container.make('admin.repository'),
        container.make('admin.jwtStrategy'),
        this.core
      )
    })

    this.core.container.factory('admin.refreshUseCase', (container: any) => {
      return new RefreshAdminTokenUseCase(container.make('admin.jwtStrategy'))
    })

    this.core.container.factory('admin.logoutUseCase', (container: any) => {
      return new LogoutAdminUseCase(
        container.make('admin.tokenBlacklist'),
        container.make('admin.jwtStrategy')
      )
    })

    this.core.container.factory('admin.listUseCase', (container: any) => {
      return new ListAdminsUseCase(container.make('admin.repository'))
    })

    this.core.container.factory('admin.getUseCase', (container: any) => {
      return new GetAdminUseCase(container.make('admin.repository'))
    })

    this.core.container.factory('admin.createUseCase', (container: any) => {
      return new CreateAdminUseCase(container.make('admin.repository'), this.core)
    })

    this.core.container.factory('admin.updateUseCase', (container: any) => {
      return new UpdateAdminUseCase(container.make('admin.repository'), this.core)
    })

    this.core.container.factory('admin.deleteUseCase', (container: any) => {
      return new DeleteAdminUseCase(container.make('admin.repository'), this.core)
    })

    // Controllers
    this.core.container.factory('admin.authController', (container: any) => {
      return new AdminAuthController(
        container.make('admin.loginUseCase'),
        container.make('admin.refreshUseCase'),
        container.make('admin.logoutUseCase')
      )
    })

    this.core.container.factory('admin.controller', (container: any) => {
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
    // 取得 router 和 repository
    const router = this.core.container.make('router') as Router
    const adminRepo = this.core.container.make('admin.repository')
    const jwtStrategy = this.core.container.make('admin.jwtStrategy')

    // 建立 middleware
    const authMiddleware = adminAuthMiddleware(this.core, jwtStrategy, adminRepo)

    // 掛載路由
    const authController = this.core.container.make('admin.authController')
    const adminController = this.core.container.make('admin.controller')

    // 認證路由（無需認證）
    router.post('/api/admin/auth/login', (ctx) => authController.login(ctx))
    router.post('/api/admin/auth/refresh', (ctx) => authController.refresh(ctx))

    // 需要認證的路由
    router.post('/api/admin/auth/logout', authMiddleware, (ctx) => authController.logout(ctx))
    router.get('/api/admin/auth/me', authMiddleware, (ctx) => authController.me(ctx))

    // Admin CRUD 路由
    router.get('/api/admin/v1/admins', authMiddleware, (ctx) => adminController.index(ctx))
    router.get('/api/admin/v1/admins/:id', authMiddleware, (ctx) => adminController.show(ctx))
    router.post('/api/admin/v1/admins', authMiddleware, (ctx) => adminController.store(ctx))
    router.patch('/api/admin/v1/admins/:id', authMiddleware, (ctx) => adminController.update(ctx))
    router.delete('/api/admin/v1/admins/:id', authMiddleware, (ctx) => adminController.destroy(ctx))

    // Bootstrap super admin
    await this.bootstrapSuperAdmin(adminRepo)

    // 監聽 admin 刪除事件
    this.core.hooks.addAction('admin:deleted', async (data: any) => {
      // 清除關聯的 admin_roles（由 rbac satellite 處理）
      await this.core.hooks.doAction('admin:deleted-cascade', data)
    })
  }

  private async bootstrapSuperAdmin(adminRepo: any): Promise<void> {
    const email = process.env.ADMIN_EMAIL || 'admin@example.com'
    const password = process.env.ADMIN_PASSWORD || 'password'
    const name = process.env.ADMIN_NAME || '系統管理員'

    // 檢查是否已存在
    const existing = await adminRepo.findByEmail(email)
    if (existing) {
      return
    }

    // 建立 super admin
    const adminEmail = AdminEmail.create(email)
    const admin = Admin.createSuper(crypto.randomUUID(), adminEmail, name, password)

    await adminRepo.save(admin)
    console.log(`✅ Bootstrap super admin: ${email}`)
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
