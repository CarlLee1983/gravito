import type { ZodSchema } from 'zod'
import type { AstralResource } from './types'

/**
 * Astral 配置錯誤基類
 * @public
 */
export class AstralError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message)
    this.name = 'AstralError'
    Object.setPrototypeOf(this, AstralError.prototype)
  }
}

/**
 * Astral 配置錯誤
 * 當配置參數不正確或缺失時拋出
 * @public
 */
export class AstralConfigError extends AstralError {
  constructor(
    message: string,
    public readonly field: string
  ) {
    super(`Astral 配置錯誤於 '${field}': ${message}`, 'ASTRAL_CONFIG_ERROR')
    this.name = 'AstralConfigError'
    Object.setPrototypeOf(this, AstralConfigError.prototype)
  }
}

/**
 * Astral Schema 轉換錯誤
 * 當 Schema 轉換失敗時拋出
 * @public
 */
export class AstralSchemaError extends AstralError {
  constructor(
    message: string,
    public readonly schema: ZodSchema | any,
    public readonly cause?: Error
  ) {
    super(`Schema 轉換錯誤: ${message}`, 'ASTRAL_SCHEMA_ERROR')
    this.name = 'AstralSchemaError'
    if (cause) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`
    }
    Object.setPrototypeOf(this, AstralSchemaError.prototype)
  }
}

/**
 * Astral 資源驗證錯誤
 * 當資源定義不符合規範時拋出
 * @public
 */
export class AstralResourceError extends AstralError {
  constructor(
    message: string,
    public readonly resource: AstralResource,
    public readonly field?: string
  ) {
    const location = field ? ` 於欄位 '${field}'` : ''
    super(`資源 '${resource.path}' 驗證錯誤${location}: ${message}`, 'ASTRAL_RESOURCE_ERROR')
    this.name = 'AstralResourceError'
    Object.setPrototypeOf(this, AstralResourceError.prototype)
  }
}

/**
 * Astral 路由匹配錯誤
 * 當路由匹配失敗或出現歧義時拋出
 * @public
 */
export class AstralRouteError extends AstralError {
  constructor(
    message: string,
    public readonly path: string,
    public readonly method?: string
  ) {
    const methodStr = method ? ` [${method}]` : ''
    super(`路由錯誤${methodStr} '${path}': ${message}`, 'ASTRAL_ROUTE_ERROR')
    this.name = 'AstralRouteError'
    Object.setPrototypeOf(this, AstralRouteError.prototype)
  }
}

/**
 * Astral 生成錯誤
 * 當 OpenAPI 規範生成過程中出現錯誤時拋出
 * @public
 */
export class AstralGenerationError extends AstralError {
  constructor(
    message: string,
    public readonly context?: Record<string, any>,
    public readonly cause?: Error
  ) {
    super(`OpenAPI 生成錯誤: ${message}`, 'ASTRAL_GENERATION_ERROR')
    this.name = 'AstralGenerationError'
    if (cause) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`
    }
    Object.setPrototypeOf(this, AstralGenerationError.prototype)
  }
}
