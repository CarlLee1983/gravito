import type { PlanetCore } from '@gravito/core'
import { AdminErrorFactory } from '../../../Application/Errors/AdminError'
import type { IAdminRepository } from '../../Contracts/IAdminRepository'
import { Admin } from '../../Entities/Admin'
import type { AdminEmail } from '../../ValueObjects/AdminEmail'
import { AdminManagerRole } from '../Roles/AdminManagerRole'

/**
 * 管理員管理上下文協調器
 * 協調管理員的建立、停用、更新等操作
 */
export class AdminManagementContext {
  constructor(
    private readonly adminRepo: IAdminRepository,
    private readonly core: PlanetCore
  ) {}

  /**
   * 建立新管理員
   */
  async createAdmin(
    email: AdminEmail,
    name: string,
    passwordHash: string,
    requestingAdmin: Admin,
    options: { isSuper?: boolean } = {}
  ): Promise<Admin> {
    // 檢查權限
    const managerRole = new AdminManagerRole(requestingAdmin)
    if (!managerRole.canCreate()) {
      throw AdminErrorFactory.forbidden('Only super admin can create admins')
    }

    // 檢查重複
    const exists = await this.adminRepo.exists(email.value)
    if (exists) {
      throw AdminErrorFactory.adminExists(email.value)
    }

    // 建立新 Admin
    const id = crypto.randomUUID()
    const admin = Admin.create(id, email, name, passwordHash, {
      isSuper: options.isSuper,
      createdBy: requestingAdmin.id,
    })

    // 持久化
    await this.adminRepo.save(admin)

    // 發出 Hook
    await this.core.hooks.doAction('admin:created', {
      adminId: admin.id,
      email: admin.email.value,
      isSuper: admin.isSuper,
      createdBy: requestingAdmin.id,
    })

    return admin
  }

  /**
   * 停用管理員
   */
  async suspendAdmin(adminId: string, requestingAdmin: Admin): Promise<Admin> {
    // 檢查權限
    const managerRole = new AdminManagerRole(requestingAdmin)

    // 取得目標 admin
    const admin = await this.adminRepo.findById(adminId)
    if (!admin) {
      throw AdminErrorFactory.adminNotFound(adminId)
    }

    // 檢查權限
    if (!managerRole.canSuspend(admin)) {
      throw AdminErrorFactory.forbidden('Cannot suspend this admin')
    }

    // 執行停用
    admin.suspend()
    await this.adminRepo.save(admin)

    // 發出 Hook
    await this.core.hooks.doAction('admin:suspended', {
      adminId: admin.id,
      email: admin.email.value,
    })

    return admin
  }

  /**
   * 啟用管理員
   */
  async activateAdmin(adminId: string): Promise<Admin> {
    const admin = await this.adminRepo.findById(adminId)
    if (!admin) {
      throw AdminErrorFactory.adminNotFound(adminId)
    }

    admin.activate()
    await this.adminRepo.save(admin)

    return admin
  }

  /**
   * 更新管理員資料
   */
  async updateProfile(
    adminId: string,
    name: string,
    metadata?: Record<string, unknown>
  ): Promise<Admin> {
    const admin = await this.adminRepo.findById(adminId)
    if (!admin) {
      throw AdminErrorFactory.adminNotFound(adminId)
    }

    admin.updateProfile(name, metadata)
    await this.adminRepo.save(admin)

    return admin
  }

  /**
   * 刪除管理員
   */
  async deleteAdmin(adminId: string, requestingAdmin: Admin): Promise<void> {
    // 檢查權限
    const managerRole = new AdminManagerRole(requestingAdmin)

    // 取得目標 admin
    const admin = await this.adminRepo.findById(adminId)
    if (!admin) {
      throw AdminErrorFactory.adminNotFound(adminId)
    }

    // 檢查權限
    if (!managerRole.canDelete(admin)) {
      throw AdminErrorFactory.forbidden('Cannot delete this admin')
    }

    // 執行刪除
    await this.adminRepo.delete(adminId)

    // 發出 Hook
    await this.core.hooks.doAction('admin:deleted', {
      adminId: admin.id,
      email: admin.email.value,
    })
  }
}
