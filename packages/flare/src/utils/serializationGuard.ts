/**
 * 序列化檢查結果介面
 */
export interface SerializationCheckResult {
  /** 是否可安全序列化 */
  serializable: boolean
  /** 有問題的屬性路徑列表 */
  problematicPaths: string[]
  /** 警告訊息列表 */
  warnings: string[]
}

/**
 * 檢查物件是否可安全序列化
 *
 * @param obj - 要檢查的物件
 * @param path - 當前路徑（用於巢狀物件追蹤）
 * @returns 序列化檢查結果
 *
 * @example
 * ```typescript
 * const result = checkSerializable({ name: 'test', fn: () => {} })
 * console.log(result.serializable) // false
 * console.log(result.problematicPaths) // ['fn']
 * ```
 */
export function checkSerializable(obj: unknown, path = ''): SerializationCheckResult {
  const problematicPaths: string[] = []
  const warnings: string[] = []
  const seen = new WeakSet<object>()

  function check(value: unknown, currentPath: string): void {
    // 處理 null 和 undefined
    if (value === null || value === undefined) {
      return
    }

    // 處理基本型別
    if (typeof value !== 'object' && typeof value !== 'function' && typeof value !== 'symbol') {
      return
    }

    // 檢查 Symbol
    if (typeof value === 'symbol') {
      problematicPaths.push(currentPath)
      warnings.push(`發現不可序列化的 Symbol 於路徑: ${currentPath}`)
      return
    }

    // 檢查 Function
    if (typeof value === 'function') {
      problematicPaths.push(currentPath)
      warnings.push(`發現不可序列化的 Function 於路徑: ${currentPath}`)
      return
    }

    // 檢查循環引用
    if (seen.has(value as object)) {
      problematicPaths.push(currentPath)
      warnings.push(`發現循環引用於路徑: ${currentPath}`)
      return
    }
    seen.add(value as object)

    // 允許的特殊型別
    if (
      value instanceof Date ||
      value instanceof Map ||
      value instanceof Set ||
      value instanceof RegExp ||
      value instanceof Error
    ) {
      return
    }

    // 檢查不允許的複雜型別
    if (
      value instanceof Promise ||
      value instanceof WeakMap ||
      value instanceof WeakSet ||
      value instanceof ArrayBuffer ||
      value instanceof DataView ||
      (typeof Buffer !== 'undefined' && value instanceof Buffer)
    ) {
      problematicPaths.push(currentPath)
      warnings.push(`發現不可序列化的 ${value.constructor.name} 於路徑: ${currentPath}`)
      return
    }

    // 處理陣列
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        const itemPath = currentPath ? `${currentPath}[${index}]` : `[${index}]`
        check(item, itemPath)
      })
      return
    }

    // 處理一般物件
    for (const [key, val] of Object.entries(value)) {
      // 跳過底線開頭的私有屬性
      if (key.startsWith('_')) {
        continue
      }

      const newPath = currentPath ? `${currentPath}.${key}` : key
      check(val, newPath)
    }
  }

  check(obj, path)

  return {
    serializable: problematicPaths.length === 0,
    problematicPaths,
    warnings,
  }
}

/**
 * 斷言物件可序列化，不可序列化時拋出錯誤
 *
 * @param obj - 要檢查的物件
 * @throws {Error} 當物件不可序列化時
 *
 * @example
 * ```typescript
 * assertSerializable({ name: 'test' }) // OK
 * assertSerializable({ fn: () => {} }) // 拋出錯誤
 * ```
 */
export function assertSerializable(obj: unknown): void {
  const result = checkSerializable(obj)

  if (!result.serializable) {
    throw new Error(
      `物件包含不可序列化的屬性:\n` +
        `問題路徑: ${result.problematicPaths.join(', ')}\n` +
        `詳細資訊:\n${result.warnings.join('\n')}`
    )
  }
}
