import type { Context } from 'hono'
import type { ListPermissionsUseCase } from '../../../Application/UseCases/ListPermissions'

/**
 * 權限管理 Controller
 */
export class PermissionController {
  constructor(private listUseCase: ListPermissionsUseCase) {}

  /**
   * GET /api/admin/v1/rbac/permissions
   */
  async index(ctx: Context) {
    const page = parseInt(ctx.req.query('page') || '1')
    const limit = parseInt(ctx.req.query('limit') || '10')
    const groupName = ctx.req.query('groupName')
    const isSystem = ctx.req.query('isSystem') === 'true'

    const result = await this.listUseCase.execute(
      { groupName, isSystem: isSystem || undefined },
      { page, limit }
    )

    return ctx.json(result, 200)
  }
}
