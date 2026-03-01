import type { Context } from 'hono'
import type { AssignRoleToAdminUseCase } from '../../../Application/UseCases/AssignRoleToAdmin'
import type { CreateRoleUseCase } from '../../../Application/UseCases/CreateRole'
import type { DeleteRoleUseCase } from '../../../Application/UseCases/DeleteRole'
import type { GetRoleUseCase } from '../../../Application/UseCases/GetRole'
import type { ListRolesUseCase } from '../../../Application/UseCases/ListRoles'
import type { RevokeRoleFromAdminUseCase } from '../../../Application/UseCases/RevokeRoleFromAdmin'
import type { SyncRolePermissionsUseCase } from '../../../Application/UseCases/SyncRolePermissions'
import type { UpdateRoleUseCase } from '../../../Application/UseCases/UpdateRole'

/**
 * 角色管理 Controller
 */
export class RoleController {
  constructor(
    private listUseCase: ListRolesUseCase,
    private getUseCase: GetRoleUseCase,
    private createUseCase: CreateRoleUseCase,
    private updateUseCase: UpdateRoleUseCase,
    private deleteUseCase: DeleteRoleUseCase,
    private syncUseCase: SyncRolePermissionsUseCase,
    private assignUseCase: AssignRoleToAdminUseCase,
    private revokeUseCase: RevokeRoleFromAdminUseCase
  ) {}

  /**
   * GET /api/admin/v1/rbac/roles
   */
  async index(ctx: Context) {
    const page = parseInt(ctx.req.query('page') || '1')
    const limit = parseInt(ctx.req.query('limit') || '10')
    const isSystem = ctx.req.query('isSystem') === 'true'

    const result = await this.listUseCase.execute(
      { isSystem: isSystem || undefined },
      { page, limit }
    )

    return ctx.json(result, 200)
  }

  /**
   * GET /api/admin/v1/rbac/roles/:id
   */
  async show(ctx: Context) {
    const id = ctx.req.param('id')
    const result = await this.getUseCase.execute(id)
    return ctx.json(result, 200)
  }

  /**
   * POST /api/admin/v1/rbac/roles
   */
  async store(ctx: Context) {
    const { name, displayName, description } = await ctx.req.json()
    const requestingAdmin = ctx.get('admin')

    const result = await this.createUseCase.execute(name, displayName, description, requestingAdmin)

    return ctx.json(result, 201)
  }

  /**
   * PATCH /api/admin/v1/rbac/roles/:id
   */
  async update(ctx: Context) {
    const id = ctx.req.param('id')
    const { displayName, description } = await ctx.req.json()

    const result = await this.updateUseCase.execute(id, displayName, description)
    return ctx.json(result, 200)
  }

  /**
   * DELETE /api/admin/v1/rbac/roles/:id
   */
  async destroy(ctx: Context) {
    const id = ctx.req.param('id')
    const requestingAdmin = ctx.get('admin')

    await this.deleteUseCase.execute(id, requestingAdmin)
    return ctx.json({ success: true }, 200)
  }

  /**
   * PUT /api/admin/v1/rbac/roles/:id/permissions
   */
  async syncPermissions(ctx: Context) {
    const id = ctx.req.param('id')
    const { permissionIds } = await ctx.req.json()

    const result = await this.syncUseCase.execute(id, permissionIds)
    return ctx.json(result, 200)
  }

  /**
   * POST /api/admin/v1/rbac/admins/:adminId/roles
   */
  async assignRole(ctx: Context) {
    const adminId = ctx.req.param('adminId')
    const { roleId } = await ctx.req.json()

    await this.assignUseCase.execute(adminId, roleId)
    return ctx.json({ success: true }, 200)
  }

  /**
   * DELETE /api/admin/v1/rbac/admins/:adminId/roles/:roleId
   */
  async revokeRole(ctx: Context) {
    const adminId = ctx.req.param('adminId')
    const roleId = ctx.req.param('roleId')

    await this.revokeUseCase.execute(adminId, roleId)
    return ctx.json({ success: true }, 200)
  }
}
