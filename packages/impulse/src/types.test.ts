/**
 * Type tests for @gravito/impulse Phase 2 implementation.
 *
 * These tests verify that the typed FormRequest classes provide
 * proper TypeScript inference without runtime overhead.
 */

import { z } from 'zod'
import { ValibotFormRequest, ZodFormRequest } from '../src'

// Test data interfaces
interface UserData {
  name: string
  email: string
  age?: number
}

interface ProductData {
  title: string
  price: number
  category: 'electronics' | 'books' | 'clothing'
}

// Zod schema examples
const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  age: z.number().min(18).optional(),
})

const productSchema = z.object({
  title: z.string().min(1),
  price: z.number().positive(),
  category: z.enum(['electronics', 'books', 'clothing']),
})

// Valibot mock schema (duck-typed interface)
const mockValibotUserSchema = {
  _run: (dataset: unknown) => ({
    issues: [],
  }),
  parse: (data: unknown) => data as UserData,
}

// Test typed Zod FormRequest classes
class CreateUserRequest extends ZodFormRequest<typeof userSchema> {
  readonly schema = userSchema
}

class CreateProductRequest extends ZodFormRequest<typeof productSchema> {
  readonly schema = productSchema
}

// Test typed Valibot FormRequest classes
class CreateUserRequestValibot extends ValibotFormRequest<UserData> {
  readonly schema = mockValibotUserSchema
}

class CreateProductRequestValibot extends ValibotFormRequest<ProductData> {
  readonly schema = {
    _run: (dataset: unknown) => ({ issues: [] }),
    parse: (data: unknown) => data as ProductData,
  }
}

// Type inference tests
type UserFormDataType = CreateUserRequest extends ZodFormRequest<infer T> ? z.infer<T> : never
type ProductFormDataType = CreateProductRequest extends ZodFormRequest<infer T> ? z.infer<T> : never
type UserValibotDataType = CreateUserRequestValibot extends ValibotFormRequest<infer T> ? T : never

// Compile-time type assertions
const _typeTest1: UserFormDataType = {
  name: 'John Doe',
  email: 'john@example.com',
  age: 25, // optional
}

const _typeTest2: ProductFormDataType = {
  title: 'TypeScript Handbook',
  price: 29.99,
  category: 'books',
}

const _typeTest3: UserValibotDataType = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  // age is optional
}

// Test that incorrect types are caught at compile time
// Uncomment these to verify TypeScript errors:

// const _typeError1: UserFormDataType = {
//   name: 123, // Error: Type 'number' is not assignable to type 'string'
//   email: 'invalid-email', // Should be caught by runtime validation
// }

// const _typeError2: ProductFormDataType = {
//   title: 'Product',
//   price: -10, // Error: negative price (caught at runtime by schema)
//   category: 'invalid' // Error: not in enum
// }

// Export for potential runtime testing
export {
  CreateUserRequest,
  CreateProductRequest,
  CreateUserRequestValibot,
  CreateProductRequestValibot,
  userSchema,
  productSchema,
  mockValibotUserSchema,
}
