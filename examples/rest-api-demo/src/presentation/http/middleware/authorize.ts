/**
 * Authorize Middleware
 *
 * 檢查用戶是否有權執行特定操作（基於角色或權限）
 */

import { AuthorizationException, type GravitoContext, type GravitoNext } from '@gravito/core'

export interface RBACRule {
  role: string
  permissions?: string[]
}

/**
 * 基於角色的授權中間件
 *
 * 檢查當前用戶是否具有執行操作所需的角色或權限
 *
 * @param roles - 允許的角色列表
 * @returns Gravito 中間件函數
 * @throws {AuthorizationException} 如果用戶沒有必要的角色或權限
 *
 * @example
 * ```typescript
 * // 只允許 admin 和 moderator 角色
 * app.post('/admin/users', authorize('admin', 'moderator'), handler)
 * ```
 */
export function authorize(...roles: string[]) {
  return async (ctx: GravitoContext, next: GravitoNext) => {
    const user = ctx.get('user') as any

    if (!user) {
      throw new AuthorizationException('User not found in context')
    }

    // 檢查用戶是否具有任何允許的角色
    const hasRole = roles.includes(user.role)

    if (!hasRole) {
      throw new AuthorizationException(`User does not have required roles: ${roles.join(', ')}`)
    }

    return await next()
  }
}

/**
 * 基於權限的授權中間件
 *
 * 檢查當前用戶是否具有特定的權限
 *
 * @param permissions - 所需的權限列表
 * @param requireAll - 是否需要所有權限（true）或任何一個（false）
 * @returns Gravito 中間件函數
 * @throws {AuthorizationException} 如果用戶沒有必要的權限
 *
 * @example
 * ```typescript
 * // 需要 create_post 或 edit_post 權限
 * app.post('/posts', can('create_post', 'edit_post'), handler)
 * ```
 */
export function can(permissions: string[], requireAll = false) {
  return async (ctx: GravitoContext, next: GravitoNext) => {
    const user = ctx.get('user') as any

    if (!user) {
      throw new AuthorizationException('User not found in context')
    }

    // 如果用戶是 admin，允許所有操作
    if (user.role === 'admin') {
      return await next()
    }

    // TODO: 從數據庫或快取中獲取用戶權限
    const userPermissions = await getUserPermissions(user.id)

    if (requireAll) {
      // 需要所有權限
      const hasAll = permissions.every((perm) => userPermissions.includes(perm))
      if (!hasAll) {
        throw new AuthorizationException(
          `User does not have required permissions: ${permissions.join(', ')}`
        )
      }
    } else {
      // 需要任何一個權限
      const hasAny = permissions.some((perm) => userPermissions.includes(perm))
      if (!hasAny) {
        throw new AuthorizationException(
          `User does not have any of required permissions: ${permissions.join(', ')}`
        )
      }
    }

    return await next()
  }
}

/**
 * 角色檢查中間件
 *
 * 檢查用戶是否具有特定角色
 *
 * @param role - 所需的角色
 * @returns Gravito 中間件函數
 *
 * @example
 * ```typescript
 * // 只允許 admin
 * app.delete('/users/:id', isRole('admin'), handler)
 * ```
 */
export function isRole(role: string) {
  return async (ctx: GravitoContext, next: GravitoNext) => {
    const user = ctx.get('user') as any

    if (!user || user.role !== role) {
      throw new AuthorizationException(`User must have ${role} role`)
    }

    return await next()
  }
}

/**
 * 檢查用戶是否是訪客
 *
 * @returns Gravito 中間件函數
 * @throws {AuthorizationException} 如果用戶已認證
 */
export function guest() {
  return async (ctx: GravitoContext, next: GravitoNext) => {
    const user = ctx.get('user') as any

    if (user) {
      throw new AuthorizationException('User is already authenticated')
    }

    return await next()
  }
}

/**
 * 獲取用戶權限（TODO: 需要實現）
 */
async function getUserPermissions(userId: string): Promise<string[]> {
  // TODO: 從數據庫或快取中獲取用戶權限
  // 示例：
  // const permissions = await db.query('SELECT permission FROM user_permissions WHERE user_id = ?', [userId])
  // return permissions.map(p => p.permission)

  // 臨時實現：基於角色返回預設權限
  return []
}

export default {
  authorize,
  can,
  isRole,
  guest,
}
