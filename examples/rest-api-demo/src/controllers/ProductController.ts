import type { GravitoContext } from '@gravito/core'

export class ProductController {
  async index(ctx: GravitoContext) {
    return ctx.json({ data: [] })
  }

  async store(ctx: GravitoContext) {
    const data = await ctx.req.json()
    return ctx.json({ data }, 201)
  }

  async show(ctx: GravitoContext) {
    const id = ctx.req.param('id')
    return ctx.json({ data: { id } })
  }
}
