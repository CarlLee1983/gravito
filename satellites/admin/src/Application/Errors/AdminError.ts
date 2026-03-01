/**
 * 管理員系統特定的業務錯誤
 */
export class AdminError extends Error {
  constructor(
    public code: AdminErrorCode,
    message: string,
    public statusCode = 400
  ) {
    super(message)
    this.name = 'AdminError'
  }
}

export type AdminErrorCode =
  | 'ADMIN_NOT_FOUND'
  | 'INVALID_CREDENTIALS'
  | 'ADMIN_INACTIVE'
  | 'ADMIN_EXISTS'
  | 'FORBIDDEN'
  | 'TOKEN_EXPIRED'
  | 'CANNOT_SUSPEND_SUPER'

/**
 * 靜態工廠方法集
 */
export const AdminErrorFactory = {
  adminNotFound: (id: string): AdminError =>
    new AdminError('ADMIN_NOT_FOUND', `Admin not found: ${id}`, 404),

  invalidCredentials: (): AdminError =>
    new AdminError('INVALID_CREDENTIALS', 'Invalid email or password', 401),

  adminInactive: (email: string): AdminError =>
    new AdminError('ADMIN_INACTIVE', `Admin account is inactive: ${email}`, 403),

  adminExists: (email: string): AdminError =>
    new AdminError('ADMIN_EXISTS', `Admin already exists with email: ${email}`, 409),

  forbidden: (reason?: string): AdminError =>
    new AdminError('FORBIDDEN', `Access forbidden${reason ? ': ' + reason : ''}`, 403),

  tokenExpired: (): AdminError => new AdminError('TOKEN_EXPIRED', 'Token has expired', 401),

  cannotSuspendSuper: (): AdminError =>
    new AdminError('CANNOT_SUSPEND_SUPER', 'Cannot suspend super admin account', 400),
}
