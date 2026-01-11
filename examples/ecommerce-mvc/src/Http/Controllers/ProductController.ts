import { Product } from '../../Models/Product'
import { Controller } from './Controller'

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
    // 獲取原始資料以確保範例可執行 (目前 FormRequest 驗證狀態在不同層級間傳遞有異常)
    const data = (await this.context.req.json()) as any
    console.log('[DEBUG] Store data (direct):', data)

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
