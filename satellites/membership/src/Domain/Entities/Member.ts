import { Entity } from '@gravito/enterprise'

/**
 * Member status enumeration
 */
export enum MemberStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
}

/**
 * Properties for the Member entity
 */
export interface MemberProps {
  email: string
  name: string
  passwordHash: string
  status: MemberStatus
  roles: string[]
  verificationToken?: string
  emailVerifiedAt?: Date
  passwordResetToken?: string
  passwordResetExpiresAt?: Date
  currentSessionId?: string
  rememberToken?: string
  createdAt: Date
  updatedAt: Date
  /** Flexible metadata for extensions */
  metadata?: Record<string, any>
}

/**
 * Member Domain Entity
 */
export class Member extends Entity<string> {
  private constructor(
    id: string,
    private props: MemberProps
  ) {
    super(id)
  }

  static create(id: string, name: string, email: string, passwordHash: string): Member {
    return new Member(id, {
      name,
      email,
      passwordHash,
      status: MemberStatus.PENDING,
      roles: ['member'],
      verificationToken: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static reconstitute(id: string, props: MemberProps): Member {
    return new Member(id, props)
  }

  // Getters
  get name() {
    return this.props.name
  }
  get email() {
    return this.props.email
  }
  get status() {
    return this.props.status
  }
  get roles() {
    return this.props.roles
  }
  get passwordHash() {
    return this.props.passwordHash
  }
  get createdAt() {
    return this.props.createdAt
  }
  get emailVerifiedAt() {
    return this.props.emailVerifiedAt
  }
  get verificationToken() {
    return this.props.verificationToken
  }
  get passwordResetToken() {
    return this.props.passwordResetToken
  }
  get passwordResetExpiresAt() {
    return this.props.passwordResetExpiresAt
  }
  get currentSessionId() {
    return this.props.currentSessionId
  }
  get rememberToken() {
    return this.props.rememberToken
  }
  get metadata() {
    return this.props.metadata || {}
  }

  // Authenticatable implementation
  getAuthIdentifier(): string {
    return this.id
  }
  getAuthPassword(): string {
    return this.props.passwordHash
  }
  getRememberToken(): string | null {
    return this.props.rememberToken || null
  }
  setRememberToken(token: string): void {
    this.props.rememberToken = token
    this.props.updatedAt = new Date()
  }

  /**
   * Bind a session ID to this member to restrict multi-device login.
   */
  public bindSession(sessionId: string): void {
    this.props.currentSessionId = sessionId
    this.props.updatedAt = new Date()
  }

  /**
   * Get current membership level (from metadata or default)
   */
  get level(): string {
    return this.metadata.level || 'standard'
  }

  /**
   * Check if member has a specific role
   */
  public hasRole(role: string): boolean {
    return this.props.roles.includes(role)
  }

  /**
   * Assign a new role
   */
  public addRole(role: string): void {
    if (!this.hasRole(role)) {
      this.props.roles.push(role)
      this.props.updatedAt = new Date()
    }
  }

  /**
   * Remove a role
   */
  public removeRole(role: string): void {
    this.props.roles = this.props.roles.filter((r) => r !== role)
    this.props.updatedAt = new Date()
  }

  /**
   * Update membership level
   */
  public changeLevel(newLevel: string): void {
    this.updateMetadata({ level: newLevel })
  }

  /**
   * Update core profile information
   */
  public updateProfile(name: string): void {
    this.props.name = name
    this.props.updatedAt = new Date()
  }

  /**
   * Update member password
   */
  public changePassword(newPasswordHash: string): void {
    this.props.passwordHash = newPasswordHash
    this.props.updatedAt = new Date()
  }

  /**
   * Merges new metadata into existing metadata
   */
  public updateMetadata(data: Record<string, any>): void {
    this.props.metadata = {
      ...(this.props.metadata || {}),
      ...data,
    }
    this.props.updatedAt = new Date()
  }

  /**
   * Mark email as verified
   */
  public verifyEmail(): void {
    this.props.emailVerifiedAt = new Date()
    this.props.status = MemberStatus.ACTIVE
    this.props.verificationToken = undefined
    this.props.updatedAt = new Date()
  }

  /**
   * Generate a password reset token
   */
  public generatePasswordResetToken(): void {
    this.props.passwordResetToken = crypto.randomUUID()
    this.props.passwordResetExpiresAt = new Date(Date.now() + 3600000)
    this.props.updatedAt = new Date()
  }

  /**
   * Complete password reset
   */
  public resetPassword(newPasswordHash: string): void {
    this.props.passwordHash = newPasswordHash
    this.props.passwordResetToken = undefined
    this.props.passwordResetExpiresAt = undefined
    this.props.updatedAt = new Date()
  }
}
