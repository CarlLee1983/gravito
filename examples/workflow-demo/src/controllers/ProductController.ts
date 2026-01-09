import type { GravitoContext } from '@gravito/core'
import { ProductService } from '../services/ProductService'

const productService = new ProductService()

export class ProductController {
  index = async (ctx: GravitoContext) => {
    const products = await productService.list()
    return ctx.json({ products })
  }

  create = async (ctx: GravitoContext) => {
    const payload = await ctx.req.json()
    const { name, sku, price, inventory } = payload
    if (!name || !sku || typeof price !== 'number' || typeof inventory !== 'number') {
      return ctx.json({ error: 'Invalid product payload' }, 400)
    }
    const product = await productService.create({ name, sku, price, inventory })
    return ctx.json({ product }, 201)
  }

  update = async (ctx: GravitoContext) => {
    const id = ctx.req.param('id')
    const payload = await ctx.req.json()
    if (!id) {
      return ctx.json({ error: 'Product id missing' }, 400)
    }
    const product = await productService.update(id, payload)
    if (!product) {
      return ctx.json({ error: 'Product not found' }, 404)
    }
    return ctx.json({ product })
  }

  destroy = async (ctx: GravitoContext) => {
    const id = ctx.req.param('id')
    if (!id) {
      return ctx.json({ error: 'Product id missing' }, 400)
    }
    const deleted = await productService.delete(id as string)
    if (!deleted) {
      return ctx.json({ error: 'Product not found' }, 404)
    }
    return ctx.json({ success: true })
  }
}
