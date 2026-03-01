/**
 * Hono Context 最小介面
 */
export interface HonoContext {
  req: {
    json(): Promise<unknown>
    param(name: string): string | undefined
    query(name: string): string | undefined
    queries?(): Record<string, string>
  }
  json(data: unknown, status?: number): unknown
}

/**
 * 成功回應格式
 */
export function success<T>(data: T) {
  return { success: true as const, data }
}

/**
 * 錯誤回應格式
 */
export function failure(code: string, message: string) {
  return { success: false as const, error: { code, message } }
}

/**
 * 格式化 Zod 驗證錯誤訊息
 */
export function formatZodErrors(error: {
  issues?: Array<{ message: string; path?: PropertyKey[] }>
}): string {
  if (!error.issues || error.issues.length === 0) {
    return '驗證失敗'
  }
  return error.issues
    .map((issue) => {
      const path = issue.path?.map(String).join('.') ?? ''
      return path ? `${path}: ${issue.message}` : issue.message
    })
    .join('; ')
}
