/**
 * 會員系統特定的業務錯誤
 */
export class MembershipError extends Error {
  constructor(
    public code: MembershipErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'MembershipError'
  }
}

export type MembershipErrorCode =
  | 'MEMBER_EXISTS'
  | 'INVALID_CREDENTIALS'
  | 'MEMBER_INACTIVE'
  | 'TOKEN_EXPIRED'
  | 'UNAUTHORIZED'
  | 'EMAIL_UNVERIFIED'
  | 'MEMBER_NOT_FOUND'
