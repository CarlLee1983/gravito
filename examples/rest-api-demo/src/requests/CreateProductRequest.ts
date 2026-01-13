import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

export class CreateProductRequest extends FormRequest {
  schema = z.object({
    name: z.string().min(3).describe('Product name'),
    price: z.number().positive().describe('Price in USD'),
    description: z.string().optional().describe('Product description'),
    stock: z.number().int().min(0).default(0).describe('Available stock'),
  })
}
