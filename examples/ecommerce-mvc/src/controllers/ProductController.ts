import { Controller } from '@gravito/monolith'
import { Product } from '../models/Product'
import { StoreProductRequest } from '../requests/StoreProductRequest'

export class ProductController extends Controller {
  /**
   * Display a listing of the resource.
   */
  async index() {
    const products = await Product.all()
    return this.json({
      data: products,
      meta: { total: products.length },
    })
  }

  /**
   * Store a newly created resource in storage.
   */
  async store() {
    // 建立 Request 實例並注入 context 以獲取清洗過且驗證過的資料
    const request = new StoreProductRequest().setContext(this.context)
    const data = request.validated()

    const product = await Product.create({
      name: data.name,
      price: data.price,
      category: data.category,
    })

    return this.json(
      {
        message: 'Product created successfully',
        data: product,
      },
      201
    )
  }

  /**
   * Display the specified resource.
   */
  async show() {
    const id = this.request.param('id')
    const product = await Product.find(id)

    if (!product) {
      return this.json({ message: 'Product not found' }, 404)
    }

    return this.json(product)
  }
}
