import { Controller } from '@gravito/core'
import { Product } from '../models/Product'
import type { CreateProductRequest } from '../requests/CreateProductRequest'

export class ProductController extends Controller {
  async index() {
    return Product.all()
  }

  async store(req: CreateProductRequest) {
    // req.input is fully typed!
    const data = req.input

    const product = await Product.create(data)

    return this.response.json(product, 201)
  }

  async show(id: string) {
    return Product.findOrFail(id)
  }
}
