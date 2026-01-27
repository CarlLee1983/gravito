/**
 * Model 元數據處理工具
 * 處理 Model.hidden 和 Model.appends 的提取與轉換
 */
import type { Model, ModelStatic } from '@gravito/atlas'

/**
 * Model 元數據結構
 */
export interface ModelMetadata {
  /** Model 名稱 */
  name: string
  /** 資料表名稱 */
  table: string
  /** 主鍵欄位名稱 */
  primaryKey: string
  /** 需要隱藏的欄位 */
  hidden: string[]
  /** 需要附加的虛擬欄位 */
  appends: string[]
  /** 類型轉換定義 */
  casts: Record<string, string>
}

/**
 * Append 欄位定義
 */
export interface AppendFieldDefinition {
  /** 欄位名稱 */
  name: string
  /** GraphQL 類型 */
  graphqlType: string
  /** 是否有對應的 accessor 方法 */
  hasAccessor: boolean
}

/**
 * 從 Model 類別提取元數據
 *
 * @param model - Atlas Model 類別
 * @returns ModelMetadata
 */
export function extractModelMetadata(model: ModelStatic<Model>): ModelMetadata {
  // biome-ignore lint/suspicious/noExplicitAny: 存取 Model 靜態屬性
  const modelClass = model as any

  return {
    name: model.name,
    table: model.table,
    primaryKey: model.primaryKey,
    hidden: modelClass.hidden || [],
    appends: modelClass.appends || [],
    casts: modelClass.casts || {},
  }
}

/**
 * 過濾掉 hidden 欄位
 *
 * @param fields - 所有欄位名稱
 * @param hidden - 需要隱藏的欄位
 * @returns 過濾後的欄位
 */
export function filterHiddenFields(fields: string[], hidden: string[]): string[] {
  if (hidden.length === 0) {
    return fields
  }

  const hiddenSet = new Set(hidden)
  return fields.filter((field) => !hiddenSet.has(field))
}

/**
 * 將屬性名稱轉換為 accessor 方法名稱
 * 例如: full_name -> getFullNameAttribute
 *
 * @param propertyName - 屬性名稱 (snake_case)
 * @returns accessor 方法名稱
 */
function toAccessorMethodName(propertyName: string): string {
  // 將 snake_case 轉為 PascalCase
  const pascalCase = propertyName
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

  return `get${pascalCase}Attribute`
}

/**
 * 檢查 Model 是否有指定的 accessor 方法
 *
 * @param model - Model 類別
 * @param accessorName - accessor 方法名稱
 * @returns 是否存在該方法
 */
function hasAccessorMethod(model: ModelStatic<Model>, accessorName: string): boolean {
  return typeof model.prototype[accessorName] === 'function'
}

/**
 * 從 Model 提取 appends 欄位定義
 *
 * @param model - Atlas Model 類別
 * @returns AppendFieldDefinition 陣列
 */
export function extractAppendFields(model: ModelStatic<Model>): AppendFieldDefinition[] {
  // biome-ignore lint/suspicious/noExplicitAny: 存取 Model 靜態屬性
  const modelClass = model as any
  const appends: string[] = modelClass.appends || []

  if (appends.length === 0) {
    return []
  }

  return appends.map((appendName) => {
    const accessorMethodName = toAccessorMethodName(appendName)
    const hasAccessor = hasAccessorMethod(model, accessorMethodName)

    // 預設為 String 類型
    // 未來可以透過 TypeScript metadata 或明確的類型註解來推斷
    const graphqlType = 'String'

    return {
      name: appendName,
      graphqlType,
      hasAccessor,
    }
  })
}
