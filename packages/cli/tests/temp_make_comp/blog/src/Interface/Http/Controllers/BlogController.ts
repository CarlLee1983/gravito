import type { GravitoContext } from '@gravito/core'
import type { CreateBlog } from '../../../Application/UseCases/CreateBlog'

export class BlogController {
  constructor(private createUseCase: CreateBlog) {}

  async store(ctx: GravitoContext) {
    const body = await ctx.req.json()
    const id = await this.createUseCase.execute({ name: body.name })

    return ctx.json(
      {
        success: true,
        data: { id },
      },
      201
    )
  }

  async index(ctx: GravitoContext) {
    return ctx.json({
      success: true,
      data: [],
    })
  }
}
