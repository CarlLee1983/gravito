import type { MemberDTO } from '../../../Application/DTOs/MemberDTO'
import { MemberMapper } from '../../../Application/DTOs/MemberDTO'
import { MembershipError } from '../../../Application/Errors/MembershipError'
import type { IMemberRepository } from '../../Contracts/IMemberRepository'
import type { UpdateProfileData } from '../Roles/ProfileOwnerRole'
import { injectProfileOwnerRole } from '../Roles/ProfileOwnerRole'

export type { UpdateProfileData }

/**
 * 檔案場景協調器
 * 統整會員檔案的讀取和更新流程，使用 DCI 角色注入
 */
export class ProfileContext {
  constructor(private repository: IMemberRepository) {}

  /**
   * 取得會員檔案
   */
  async getProfile(memberId: string): Promise<MemberDTO> {
    const member = await this.repository.findById(memberId)
    if (!member) {
      throw new MembershipError('MEMBER_NOT_FOUND', `Member ${memberId} not found`)
    }

    return MemberMapper.toDTO(member)
  }

  /**
   * 更新會員檔案
   */
  async updateProfile(memberId: string, data: UpdateProfileData): Promise<MemberDTO> {
    // 1. 查找會員
    const member = await this.repository.findById(memberId)
    if (!member) {
      throw new MembershipError('MEMBER_NOT_FOUND', `Member ${memberId} not found`)
    }

    // 2. 注入檔案擁有者角色
    const owner = injectProfileOwnerRole(member)

    // 3. 驗證更新權限
    if (!owner.canUpdateProfile()) {
      throw new MembershipError('UNAUTHORIZED', 'Cannot update profile')
    }

    // 4. 清理並驗證資料
    const sanitized = owner.sanitizeProfileUpdate(data)

    // 5. 應用更新（使用 Entity 的現有方法）
    if (sanitized.name !== undefined) {
      member.updateProfile(sanitized.name)
    }

    if (sanitized.metadata !== undefined) {
      member.updateMetadata(sanitized.metadata)
    }

    // 6. 儲存變更
    await this.repository.save(member)

    // 7. 回傳更新後的檔案
    return MemberMapper.toDTO(member)
  }
}
