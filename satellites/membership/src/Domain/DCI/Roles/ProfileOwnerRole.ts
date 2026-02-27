import type { Member } from '../../Entities/Member'

/**
 * 檔案擁有者角色
 * 提供檔案更新所需的行為契約
 */
export interface ProfileOwnerRole {
  canUpdateProfile(): boolean
  sanitizeProfileUpdate(data: UpdateProfileData): UpdateProfileData
}

export interface UpdateProfileData {
  name?: string
  metadata?: Record<string, any>
}

/**
 * 將檔案擁有者角色注入到 Member 實體中
 * 驗證檔案更新權限和資料清理
 */
export function injectProfileOwnerRole(member: Member): ProfileOwnerRole {
  return {
    canUpdateProfile(): boolean {
      // 只有存在的會員可以更新檔案
      return !!member.id
    },
    sanitizeProfileUpdate(data: UpdateProfileData): UpdateProfileData {
      const sanitized: UpdateProfileData = {}

      // 只允許更新特定欄位
      if (data.name !== undefined) {
        sanitized.name = data.name.trim().slice(0, 255)
      }

      // 元資料可以更新，但限制結構
      if (data.metadata !== undefined) {
        sanitized.metadata = {
          ...member.metadata,
          ...data.metadata,
        }
        // 防止用戶修改保留欄位
        delete sanitized.metadata?.roles
        delete sanitized.metadata?.status
      }

      return sanitized
    },
  }
}
