import type { Role } from '../../Entities/Role'

/**
 * DCI Role: 角色指派者角色
 * 負責管理員與角色的指派關係
 */
export class AssignmentRole {
  constructor(private requestingAdmin: { isSuper: boolean }) {}

  /**
   * 檢查是否可以為管理員指派角色
   */
  canAssignRole(): boolean {
    return this.requestingAdmin.isSuper
  }

  /**
   * 檢查是否可以從管理員撤銷角色
   */
  canRevokeRole(): boolean {
    return this.requestingAdmin.isSuper
  }

  /**
   * 檢查是否可以查看管理員的角色列表
   */
  canViewRoles(): boolean {
    return this.requestingAdmin.isSuper
  }
}
