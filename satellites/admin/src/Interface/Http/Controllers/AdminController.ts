import type { GravitoContext } from '@gravito/core'
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
  async index(ctx: GravitoContext) {
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
  async show(ctx: GravitoContext) {
    const id = ctx.req.param('id')
    if (!id) {
      return ctx.json({ error: 'ID is required' }, 400)
    }

    const result = await this.getUseCase.execute(id)
    return ctx.json(result, 200)
  }

  /**
   * POST /api/admin/v1/admins
   */
  async store(ctx: GravitoContext) {
    const data = (await ctx.req.json()) as Record<string, unknown>
    const email = data.email as string
    const name = data.name as string
    const password = data.password as string
    const isSuper = data.isSuper as boolean
    const requestingAdmin = ctx.get('admin') as unknown

    const result = await this.createUseCase.execute(email, name, password, requestingAdmin as any, {
      isSuper,
    })

    return ctx.json(result, 201)
  }

  /**
   * PATCH /api/admin/v1/admins/:id
   */
  async update(ctx: GravitoContext) {
    const id = ctx.req.param('id')
    if (!id) {
      return ctx.json({ error: 'ID is required' }, 400)
    }

    const data = (await ctx.req.json()) as Record<string, unknown>
    const name = data.name as string
    const metadata = data.metadata as Record<string, unknown>
    const requestingAdmin = ctx.get('admin') as unknown

    const result = await this.updateUseCase.execute(id, name, requestingAdmin as any, metadata)
    return ctx.json(result, 200)
  }

  /**
   * DELETE /api/admin/v1/admins/:id
   */
  async destroy(ctx: GravitoContext) {
    const id = ctx.req.param('id')
    if (!id) {
      return ctx.json({ error: 'ID is required' }, 400)
    }

    const requestingAdmin = ctx.get('admin') as unknown

    await this.deleteUseCase.execute(id, requestingAdmin as any)
    return ctx.json({ success: true }, 200)
  }
}
