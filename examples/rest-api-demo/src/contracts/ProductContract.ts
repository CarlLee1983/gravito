import { astral } from '@gravito/astral'
import { z } from 'zod'
import { CreateProductRequest } from '../requests/CreateProductRequest'

// Define the response DTO
const ProductDTO = z.object({
  id: z.number(),
  name: z.string(),
  price: z.number(),
  description: z.string().nullable(),
  stock: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const ProductContract = astral.resource('/api/products', {
  tags: ['Products'],
  operations: {
    index: {
      summary: 'List products',
      output: [ProductDTO],
    },
    store: {
      summary: 'Create product',
      input: CreateProductRequest, // Infer schema from FormRequest
      output: ProductDTO,
      status: 201,
    },
    show: {
      summary: 'Get product',
      params: { id: z.string() },
      output: ProductDTO,
    },
  },
})
