import type { IPermissionRepository } from '../../Contracts/IPermissionRepository'
import type { IRoleRepository } from '../../Contracts/IRoleRepository'
import type { PermissionKey } from '../../ValueObjects/PermissionKey'
import { AdminAsAuthorizationSubjectRole } from '../Roles/AdminAsAuthorizationSubjectRole'

export interface AdminForAuth {
  id: string
  isSuper: boolean
}

/**
 * DCI Context: 授權檢查場景
 *
 * 職責：檢查 Admin 是否擁有特定權限
 * 交互流程：
 * 1. Admin 扮演 AdminAsAuthorizationSubjectRole（被檢查者）
 * 2. Role 扮演 RoleAsPermissionContainerRole（權限容器）
 * 3. Context 協調權限檢查流程
 */
export class AuthorizationContext {
  constructor(
    private readonly roleRepo: IRoleRepository,
    private readonly permissionRepo: IPermissionRepository
  ) {}

  /**
   * 檢查管理員是否擁有特定權限
   * 支援萬用字元匹配：group:*, group:action:*
   *
   * 交互流程：
   * 1. Admin 作為 AuthorizationSubject 查詢自己的權限
   * 2. Context 檢查權限是否匹配
   */
  async checkAdminPermission(admin: AdminForAuth, permissionKey: PermissionKey): Promise<boolean> {
    // Admin 扮演 AuthorizationSubject 角色，提供自己的授權信息
    const authSubject = new AdminAsAuthorizationSubjectRole(
      admin,
      this.roleRepo,
      this.permissionRepo
    )

    // 委託給 Role 進行權限檢查
    return authSubject.hasPermission(permissionKey)
  }
}
