/**
 * 穩定雜湊演算法模組
 * 用於產生可重現的快取鍵，取代 Math.random() 的不確定性
 */

/**
 * 產生穩定的雜湊值
 * 使用 DJB2 演算法
 *
 * @param input - 任意輸入值
 * @returns 穩定的雜湊字串
 */
export function stableHash(input: unknown): string {
  const str = typeof input === 'string' ? input : JSON.stringify(input)

  // DJB2 雜湊演算法
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
  }
  return `hash:${(hash >>> 0).toString(36)}`
}

/**
 * 從 Zod schema 產生穩定的快取鍵
 * 基於 schema 結構產生確定性的鍵值，確保相同結構的 schema 產生相同的鍵
 *
 * @param schema - Zod schema 物件
 * @returns 穩定的快取鍵
 */
export function getStableSchemaKey(schema: unknown): string {
  if (Array.isArray(schema)) {
    return `array:${getStableSchemaKey(schema[0])}`
  }

  const zodSchema = schema as { _def?: Record<string, unknown> }

  if (!zodSchema?._def) {
    // 非 Zod schema，使用 JSON 序列化
    return stableHash(schema)
  }

  const def = zodSchema._def
  const typeName = (def.typeName as string) || 'unknown'

  // 處理 ZodObject
  if (typeName === 'ZodObject' && typeof def.shape === 'function') {
    const shape = def.shape() as Record<string, unknown>
    const sortedKeys = Object.keys(shape).sort()
    const keySignature = sortedKeys.map((k) => `${k}:${getStableSchemaKey(shape[k])}`).join(',')
    return `obj:{${keySignature}}`
  }

  // 處理 ZodArray
  if (typeName === 'ZodArray' && def.type) {
    return `arr:${getStableSchemaKey(def.type)}`
  }

  // 處理 ZodOptional
  if (typeName === 'ZodOptional' && def.innerType) {
    return `opt:${getStableSchemaKey(def.innerType)}`
  }

  // 處理 ZodNullable
  if (typeName === 'ZodNullable' && def.innerType) {
    return `nullable:${getStableSchemaKey(def.innerType)}`
  }

  // 處理 ZodUnion
  if (typeName === 'ZodUnion' && def.options) {
    const options = def.options as unknown[]
    const optionKeys = options.map((opt) => getStableSchemaKey(opt)).sort()
    return `union:[${optionKeys.join('|')}]`
  }

  // 處理 ZodEnum
  if (typeName === 'ZodEnum' && def.values) {
    const values = def.values as string[]
    return `enum:[${values.sort().join('|')}]`
  }

  // 處理 ZodLiteral
  if (typeName === 'ZodLiteral' && def.value !== undefined) {
    return `literal:${String(def.value)}`
  }

  // 處理 ZodTuple
  if (typeName === 'ZodTuple' && def.items) {
    const items = def.items as unknown[]
    const itemKeys = items.map((item) => getStableSchemaKey(item))
    return `tuple:[${itemKeys.join(',')}]`
  }

  // 處理 ZodRecord
  if (typeName === 'ZodRecord' && def.valueType) {
    return `record:${getStableSchemaKey(def.valueType)}`
  }

  // 處理 ZodMap
  if (typeName === 'ZodMap' && def.keyType && def.valueType) {
    return `map:${getStableSchemaKey(def.keyType)}->${getStableSchemaKey(def.valueType)}`
  }

  // 處理 ZodSet
  if (typeName === 'ZodSet' && def.valueType) {
    return `set:${getStableSchemaKey(def.valueType)}`
  }

  // 處理 ZodIntersection
  if (typeName === 'ZodIntersection' && def.left && def.right) {
    return `intersect:${getStableSchemaKey(def.left)}&${getStableSchemaKey(def.right)}`
  }

  // 處理 ZodDiscriminatedUnion
  if (typeName === 'ZodDiscriminatedUnion' && def.discriminator && def.options) {
    const options = Array.from(def.options as Map<string, unknown>).map(([_key, opt]) =>
      getStableSchemaKey(opt)
    )
    return `discriminated:${String(def.discriminator)}:[${options.sort().join('|')}]`
  }

  // 基本型別處理
  if (typeName === 'ZodString') {
    return 'str'
  }
  if (typeName === 'ZodNumber') {
    return 'num'
  }
  if (typeName === 'ZodBoolean') {
    return 'bool'
  }
  if (typeName === 'ZodDate') {
    return 'date'
  }
  if (typeName === 'ZodBigInt') {
    return 'bigint'
  }
  if (typeName === 'ZodUndefined') {
    return 'undefined'
  }
  if (typeName === 'ZodNull') {
    return 'null'
  }
  if (typeName === 'ZodAny') {
    return 'any'
  }
  if (typeName === 'ZodUnknown') {
    return 'unknown'
  }
  if (typeName === 'ZodNever') {
    return 'never'
  }
  if (typeName === 'ZodVoid') {
    return 'void'
  }

  // Fallback：使用 typeName 的雜湊
  return stableHash(typeName)
}
