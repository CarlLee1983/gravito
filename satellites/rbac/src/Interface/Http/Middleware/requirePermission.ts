import type { Context, Next } from 'hono'
import type { CheckPermissionUseCase } from '../../../Application/UseCases/CheckPermission'

/**
 * 權限檢查中間件
 * 用於保護需要特定權限的路由
 */
export function requirePermission(permissionKey: string, checkUseCase: CheckPermissionUseCase) {
  return async (ctx: Context, next: Next) => {
    const admin = ctx.get('admin')

    if (!admin) {
      return ctx.json({ error: 'Unauthorized' }, 401)
    }

    // Super admin 快速通過
    if (admin.isSuper) {
      await next()
      return
    }

    // 檢查權限
    const hasPermission = await checkUseCase.execute(
      { id: admin.id, isSuper: admin.isSuper },
      permissionKey
    )

    if (!hasPermission) {
      return ctx.json({ error: 'Forbidden: insufficient permissions' }, 403)
    }

    await next()
  }
}
