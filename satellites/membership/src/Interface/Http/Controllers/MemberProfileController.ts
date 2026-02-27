import type { GravitoContext } from '@gravito/core'
import { MembershipError } from '../../../Application/Errors/MembershipError'
import type { IMemberRepository } from '../../../Domain/Contracts/IMemberRepository'
import { ProfileContext, type UpdateProfileData } from '../../../Domain/DCI/Contexts/ProfileContext'

/**
 * 會員檔案控制器
 * 暴露會員檔案相關的 HTTP 端點
 */
export class MemberProfileController {
  constructor(private repository: IMemberRepository) {}

  /**
   * GET /api/member/me
   * 取得目前認證使用者的檔案
   */
  async me(c: GravitoContext): Promise<Response> {
    try {
      const memberId = c.get('memberId') as string | undefined

      if (!memberId) {
        return c.json({ error: 'Unauthorized' }, 401)
      }

      const ctx = new ProfileContext(this.repository)
      const profile = await ctx.getProfile(memberId)

      return c.json({ member: profile }, 200)
    } catch (error) {
      return this.handleError(c, error)
    }
  }

  /**
   * PUT /api/member/profile
   * 更新目前認證使用者的檔案
   */
  async update(c: GravitoContext): Promise<Response> {
    try {
      const memberId = c.get('memberId') as string | undefined

      if (!memberId) {
        return c.json({ error: 'Unauthorized' }, 401)
      }

      const body = await c.req.json<any>()

      // 驗證輸入
      const updateData: UpdateProfileData = {}

      if (body.name !== undefined) {
        if (typeof body.name !== 'string' || body.name.length === 0) {
          return c.json({ error: 'Invalid name' }, 400)
        }
        updateData.name = body.name
      }

      if (body.metadata !== undefined) {
        if (typeof body.metadata !== 'object') {
          return c.json({ error: 'Invalid metadata' }, 400)
        }
        updateData.metadata = body.metadata
      }

      // 若無更新資料，回傳錯誤
      if (Object.keys(updateData).length === 0) {
        return c.json({ error: 'No fields to update' }, 400)
      }

      // 執行檔案更新場景
      const ctx = new ProfileContext(this.repository)
      const updatedProfile = await ctx.updateProfile(memberId, updateData)

      return c.json({ member: updatedProfile }, 200)
    } catch (error) {
      return this.handleError(c, error)
    }
  }

  /**
   * 統一錯誤處理
   */
  private handleError(c: GravitoContext, error: any): Response {
    if (error instanceof MembershipError) {
      const statusCode =
        error.code === 'UNAUTHORIZED' ? 403 : error.code === 'MEMBER_NOT_FOUND' ? 404 : 400

      return c.json(
        {
          error: error.message,
          code: error.code,
        },
        statusCode
      )
    }

    // 通用錯誤
    return c.json({ error: 'An error occurred' }, 500)
  }
}
