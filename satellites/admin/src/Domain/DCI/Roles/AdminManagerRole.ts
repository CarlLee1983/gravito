import { AdminErrorFactory } from '../../../Application/Errors/AdminError'
import type { Admin } from '../../Entities/Admin'

/**
 * DCI Role: 管理員管理者角色 (inject function 模式)
 * 負責管理員的 CRUD 操作權限檢查及業務規則
 */
export interface AdminManagerRole {
  /**
   * 檢查是否可以管理指定的管理員
   * 不可管理超級管理員時 throw
   */
  assertCanManage(targetAdmin: Admin): void

  /**
   * 檢查是否可以建立管理員
   * 只有超級管理員可以建立任何管理員
   */
  assertCanCreate(): void

  /**
   * 檢查是否可以停用指定的管理員
   * 不可停用超級管理員或無權限時 throw
   */
  assertCanSuspend(targetAdmin: Admin): void

  /**
   * 檢查是否可以更新指定的管理員
   * 非超級管理員無法更新他人時 throw
   */
  assertCanUpdate(targetAdmin: Admin): void

  /**
   * 檢查是否可以刪除指定的管理員
   * 不可刪除超級管理員或無權限時 throw
   */
  assertCanDelete(targetAdmin: Admin): void
}

/**
 * 注入 AdminManagerRole 到 requestingAdmin
 * @param requestingAdmin - 發起請求的 Admin entity
 * @returns AdminManagerRole interface
 */
export function injectAdminManagerRole(requestingAdmin: Admin): AdminManagerRole {
  return {
    assertCanManage(targetAdmin: Admin): void {
      // 業務規則：非超級管理員無法管理他人
      if (!requestingAdmin.isSuper) {
        throw AdminErrorFactory.forbidden('Only super admin can manage admins')
      }
      // 業務規則：不可管理超級管理員
      if (targetAdmin.isSuper) {
        throw AdminErrorFactory.forbidden('Cannot manage super admin')
      }
    },

    assertCanCreate(): void {
      // 業務規則：只有超級管理員可以建立管理員
      if (!requestingAdmin.isSuper) {
        throw AdminErrorFactory.forbidden('Only super admin can create admins')
      }
    },

    assertCanSuspend(targetAdmin: Admin): void {
      // 業務規則：非超級管理員無法停用他人，且不可停用超級管理員
      if (!requestingAdmin.isSuper) {
        throw AdminErrorFactory.forbidden('Only super admin can suspend admins')
      }
      if (targetAdmin.isSuper) {
        throw AdminErrorFactory.forbidden('Cannot suspend super admin')
      }
    },

    assertCanUpdate(targetAdmin: Admin): void {
      // 業務規則：非超級管理員只能更新自己
      if (!requestingAdmin.isSuper && requestingAdmin.id !== targetAdmin.id) {
        throw AdminErrorFactory.forbidden('Cannot update another admin profile')
      }
    },

    assertCanDelete(targetAdmin: Admin): void {
      // 業務規則：非超級管理員無法刪除，且不可刪除超級管理員
      if (!requestingAdmin.isSuper) {
        throw AdminErrorFactory.forbidden('Only super admin can delete admins')
      }
      if (targetAdmin.isSuper) {
        throw AdminErrorFactory.forbidden('Cannot delete super admin')
      }
    },
  }
}
