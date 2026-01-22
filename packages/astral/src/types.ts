import type { FormRequestClass } from '@gravito/core'
import type { ZodSchema } from 'zod'

/**
 * OpenAPI Server 定義
 * @public
 */
export interface OpenAPIServer {
  /** Server URL */
  url: string
  /** Server 描述 */
  description?: string
  /** Server 變數 */
  variables?: Record<
    string,
    {
      default: string
      description?: string
      enum?: string[]
    }
  >
}

/**
 * OpenAPI Security Scheme 定義
 * @public
 */
export interface SecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect' | 'mutualTLS'
  description?: string
  name?: string
  in?: 'query' | 'header' | 'cookie'
  scheme?: string
  bearerFormat?: string
  flows?: any
  openIdConnectUrl?: string
}

/**
 * Security Requirement 定義
 * @public
 */
export type SecurityRequirement = Record<string, string[]>

/**
 * External Documentation 定義
 * @public
 */
export interface ExternalDocumentation {
  /** 外部文檔 URL */
  url: string
  /** 外部文檔描述 */
  description?: string
}

/**
 * OpenAPI Example 物件定義
 * @public
 */
export interface ExampleObject {
  /** Example 摘要 */
  summary?: string
  /** Example 描述 */
  description?: string
  /** Example 值 */
  value?: any
  /** Example 外部值 URL */
  externalValue?: string
}

/**
 * Media Type 物件定義
 * @public
 */
export interface MediaTypeObject {
  /** Schema 定義 */
  schema?: ZodSchema | any
  /** Example 值 */
  example?: any
  /** 多個 examples */
  examples?: Record<string, ExampleObject>
  /** Encoding 定義 */
  encoding?: Record<string, any>
}

/**
 * Request Body 定義
 * @public
 */
export interface RequestBodyObject {
  /** Request body 描述 */
  description?: string
  /** Content type 對應的 schema */
  content: Record<string, MediaTypeObject>
  /** 是否必要 */
  required?: boolean
}

/**
 * Operation definition for a specific route/method in an API contract.
 * @public
 */
export interface AstralOperation {
  /** Short summary of the operation */
  summary?: string
  /** Detailed description of the operation */
  description?: string
  /** Tags for categorization in the documentation UI */
  tags?: string[]
  /** Input validation schema (either a FormRequest class or a Zod schema) */
  input?: FormRequestClass | ZodSchema
  /** Output validation schema for successful responses */
  output?: ZodSchema | ZodSchema[]
  /** Map of error status codes to their respective descriptions or schemas */
  errors?: Record<number, string | ZodSchema>
  /** HTTP status code for a successful response (default: 200) */
  status?: number
  /** Schema for path parameters */
  params?: Record<string, ZodSchema>
  /** Unique operation identifier */
  operationId?: string
  /** Marks the operation as deprecated */
  deprecated?: boolean
  /** Security requirements for this operation */
  security?: SecurityRequirement[]
  /** Custom request body definition (overrides input if provided) */
  requestBody?: RequestBodyObject
  /** Request and response examples */
  examples?: {
    request?: Record<string, ExampleObject>
    response?: Record<string, ExampleObject>
  }
  /** External documentation reference */
  externalDocs?: ExternalDocumentation
}

/**
 * A resource contract that maps a base path to various operations (CRUD or custom).
 * @public
 */
export interface AstralResource {
  /** The base resource path (e.g., '/users') */
  path: string
  /** Default tags applied to all operations in this resource */
  tags?: string[]
  /** Map of operation names ('index', 'show', 'store', etc.) to their definitions */
  operations: {
    index?: AstralOperation
    show?: AstralOperation
    store?: AstralOperation
    update?: AstralOperation
    destroy?: AstralOperation
    [key: string]: AstralOperation | undefined
  }
}

/**
 * OpenAPI Tag 定義
 * @public
 */
export interface TagObject {
  /** Tag 名稱 */
  name: string
  /** Tag 描述 */
  description?: string
  /** 外部文檔 */
  externalDocs?: ExternalDocumentation
}

/**
 * OpenAPI Components 定義
 * @public
 */
export interface ComponentsObject {
  /** 共用的 schemas */
  schemas?: Record<string, ZodSchema | any>
  /** 共用的 responses */
  responses?: Record<string, any>
  /** 共用的 parameters */
  parameters?: Record<string, any>
  /** 共用的 examples */
  examples?: Record<string, ExampleObject>
  /** 共用的 request bodies */
  requestBodies?: Record<string, RequestBodyObject>
  /** 共用的 headers */
  headers?: Record<string, any>
  /** 共用的 security schemes */
  securitySchemes?: Record<string, SecurityScheme>
  /** 共用的 links */
  links?: Record<string, any>
  /** 共用的 callbacks */
  callbacks?: Record<string, any>
}

/**
 * Global configuration for the Astral OpenAPI orbit.
 * @public
 */
export interface AstralConfig {
  /** The API title shown in the documentation UI */
  title?: string
  /** The API version string */
  version?: string
  /** Brief description of the entire API */
  description?: string
  /** List of predefined resource contracts */
  contracts?: AstralResource[]
  /** The URL path where the Swagger UI will be served (default: '/docs') */
  uiPath?: string
  /** The URL path where the OpenAPI JSON spec will be served (default: '/openapi.json') */
  jsonPath?: string
  /** Shorthand for uiPath */
  path?: string
  /** Server definitions */
  servers?: OpenAPIServer[]
  /** Global security schemes */
  securitySchemes?: Record<string, SecurityScheme>
  /** Global security requirements */
  security?: SecurityRequirement[]
  /** Global tags definitions */
  tags?: TagObject[]
  /** External documentation */
  externalDocs?: ExternalDocumentation
  /** Reusable components */
  components?: ComponentsObject
}

/**
 * 從 AstralOperation 推斷 Input 類型
 * @public
 */
export type InferInput<T extends AstralOperation> = T['input'] extends ZodSchema<infer U> ? U : any

/**
 * 從 AstralOperation 推斷 Output 類型
 * @public
 */
export type InferOutput<T extends AstralOperation> =
  T['output'] extends ZodSchema<infer U>
    ? U
    : T['output'] extends Array<infer Item>
      ? Item extends ZodSchema<infer V>
        ? V[]
        : any
      : any

/**
 * 從 AstralOperation 推斷 Params 類型
 * @public
 */
export type InferParams<T extends AstralOperation> =
  T['params'] extends Record<string, ZodSchema>
    ? { [K in keyof T['params']]: T['params'][K] extends ZodSchema<infer U> ? U : any }
    : Record<string, any>

/**
 * 從 AstralOperation 推斷 Error 類型
 * @public
 */
export type InferErrors<T extends AstralOperation> =
  T['errors'] extends Record<number, any>
    ? { [K in keyof T['errors']]: T['errors'][K] extends ZodSchema<infer U> ? U : T['errors'][K] }
    : Record<number, any>
