import { FormRequest, Schema } from '@gravito/monolith'

export class StoreProductRequest extends FormRequest {
  schema() {
    return Schema.Object({
      name: Schema.String({ minLength: 3 }),
      price: Schema.Number({ minimum: 0 }),
      category: Schema.Optional(Schema.String()),
    })
  }

  authorize() {
    // 只有管理員可以新增商品 (這裡先模擬)
    return true
  }
}
