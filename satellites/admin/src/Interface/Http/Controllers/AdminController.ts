import type { Context } from 'hono'
import type { CreateAdminUseCase } from '../../../Application/UseCases/CreateAdmin'
import type { DeleteAdminUseCase } from '../../../Application/UseCases/DeleteAdmin'
import type { GetAdminUseCase } from '../../../Application/UseCases/GetAdmin'
import type { ListAdminsUseCase } from '../../../Application/UseCases/ListAdmins'
import type { UpdateAdminUseCase } from '../../../Application/UseCases/UpdateAdmin'

/**
 * Admin CRUD Controller
 */
export class AdminController {
  constructor(
    private listUseCase: ListAdminsUseCase,
    private getUseCase: GetAdminUseCase,
    private createUseCase: CreateAdminUseCase,
    private updateUseCase: UpdateAdminUseCase,
    private deleteUseCase: DeleteAdminUseCase
  ) {}

  /**
   * GET /api/admin/v1/admins
   */
  async index(ctx: Context) {
    const page = parseInt(ctx.req.query('page') || '1')
    const limit = parseInt(ctx.req.query('limit') || '10')
    const search = ctx.req.query('search')
    const status = ctx.req.query('status')

    const result = await this.listUseCase.execute({ search, status }, { page, limit })

    return ctx.json(result, 200)
  }

  /**
   * GET /api/admin/v1/admins/:id
   */
  async show(ctx: Context) {
    const id = ctx.req.param('id')
    const result = await this.getUseCase.execute(id)
    return ctx.json(result, 200)
  }

  /**
   * POST /api/admin/v1/admins
   */
  async store(ctx: Context) {
    const { email, name, password, isSuper } = await ctx.req.json()
    const requestingAdmin = ctx.get('admin')

    const result = await this.createUseCase.execute(email, name, password, requestingAdmin, {
      isSuper,
    })

    return ctx.json(result, 201)
  }

  /**
   * PATCH /api/admin/v1/admins/:id
   */
  async update(ctx: Context) {
    const id = ctx.req.param('id')
    const { name, metadata } = await ctx.req.json()
    const requestingAdmin = ctx.get('admin')

    const result = await this.updateUseCase.execute(id, name, requestingAdmin, metadata)
    return ctx.json(result, 200)
  }

  /**
   * DELETE /api/admin/v1/admins/:id
   */
  async destroy(ctx: Context) {
    const id = ctx.req.param('id')
    const requestingAdmin = ctx.get('admin')

    await this.deleteUseCase.execute(id, requestingAdmin)
    return ctx.json({ success: true }, 200)
  }
}
