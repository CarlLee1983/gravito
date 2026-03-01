/**
 * 角色與權限系統特定的業務錯誤
 */
export class RbacError extends Error {
  constructor(
    public code: RbacErrorCode,
    message: string,
    public statusCode = 400
  ) {
    super(message)
    this.name = 'RbacError'
  }
}

export type RbacErrorCode =
  | 'ROLE_NOT_FOUND'
  | 'PERMISSION_NOT_FOUND'
  | 'ROLE_EXISTS'
  | 'PERMISSION_EXISTS'
  | 'PERMISSION_DENIED'
  | 'CIRCULAR_ASSIGNMENT'
  | 'INVALID_PERMISSION_KEY'

/**
 * 靜態工廠方法集
 */
export const RbacErrorFactory = {
  roleNotFound: (id: string): RbacError =>
    new RbacError('ROLE_NOT_FOUND', `Role not found: ${id}`, 404),

  permissionNotFound: (id: string): RbacError =>
    new RbacError('PERMISSION_NOT_FOUND', `Permission not found: ${id}`, 404),

  roleExists: (name: string): RbacError =>
    new RbacError('ROLE_EXISTS', `Role already exists: ${name}`, 409),

  permissionExists: (key: string): RbacError =>
    new RbacError('PERMISSION_EXISTS', `Permission already exists: ${key}`, 409),

  permissionDenied: (reason?: string): RbacError =>
    new RbacError('PERMISSION_DENIED', `Permission denied${reason ? ': ' + reason : ''}`, 403),

  circularAssignment: (): RbacError =>
    new RbacError('CIRCULAR_ASSIGNMENT', 'Circular role assignment detected', 400),

  invalidPermissionKey: (key: string): RbacError =>
    new RbacError(
      'INVALID_PERMISSION_KEY',
      `Invalid permission key format: ${key}. Expected: group:action or group:action:field`,
      400
    ),
}
