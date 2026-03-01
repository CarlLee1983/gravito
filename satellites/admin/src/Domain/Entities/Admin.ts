import { AggregateRoot } from '@gravito/enterprise'
import type { AdminEmail } from '../ValueObjects/AdminEmail'

export enum AdminStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
}

export interface AdminProps {
  email: AdminEmail
  name: string
  passwordHash: string
  status: AdminStatus
  isSuper: boolean
  lastLoginAt?: Date
  passwordResetToken?: string
  passwordResetExpiresAt?: Date
  createdBy?: string
  createdAt: Date
  updatedAt?: Date
  metadata?: Record<string, unknown>
}

export class Admin extends AggregateRoot<string> {
  private constructor(
    id: string,
    private props: AdminProps
  ) {
    super(id)
  }

  static create(
    id: string,
    email: AdminEmail,
    name: string,
    passwordHash: string,
    options: { isSuper?: boolean; createdBy?: string } = {}
  ): Admin {
    return new Admin(id, {
      email,
      name,
      passwordHash,
      status: AdminStatus.ACTIVE,
      isSuper: options.isSuper ?? false,
      createdBy: options.createdBy,
      createdAt: new Date(),
    })
  }

  static createSuper(id: string, email: AdminEmail, name: string, passwordHash: string): Admin {
    return new Admin(id, {
      email,
      name,
      passwordHash,
      status: AdminStatus.ACTIVE,
      isSuper: true,
      createdAt: new Date(),
    })
  }

  static reconstitute(id: string, props: AdminProps): Admin {
    return new Admin(id, props)
  }

  // Getters
  get email(): AdminEmail {
    return this.props.email
  }

  get name(): string {
    return this.props.name
  }

  get passwordHash(): string {
    return this.props.passwordHash
  }

  get status(): AdminStatus {
    return this.props.status
  }

  get isSuper(): boolean {
    return this.props.isSuper
  }

  get isActive(): boolean {
    return this.props.status === AdminStatus.ACTIVE
  }

  get lastLoginAt(): Date | undefined {
    return this.props.lastLoginAt
  }

  get passwordResetToken(): string | undefined {
    return this.props.passwordResetToken
  }

  get passwordResetExpiresAt(): Date | undefined {
    return this.props.passwordResetExpiresAt
  }

  get createdBy(): string | undefined {
    return this.props.createdBy
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt
  }

  get metadata(): Record<string, unknown> {
    return this.props.metadata ?? {}
  }

  // Business methods
  suspend(): void {
    this.props.status = AdminStatus.SUSPENDED
    this.props.updatedAt = new Date()
  }

  activate(): void {
    this.props.status = AdminStatus.ACTIVE
    this.props.updatedAt = new Date()
  }

  recordLogin(): void {
    this.props.lastLoginAt = new Date()
    this.props.updatedAt = new Date()
  }

  changePassword(newPasswordHash: string): void {
    this.props.passwordHash = newPasswordHash
    this.props.passwordResetToken = undefined
    this.props.passwordResetExpiresAt = undefined
    this.props.updatedAt = new Date()
  }

  setPasswordReset(token: string, expiresAt: Date): void {
    this.props.passwordResetToken = token
    this.props.passwordResetExpiresAt = expiresAt
    this.props.updatedAt = new Date()
  }

  clearPasswordReset(): void {
    this.props.passwordResetToken = undefined
    this.props.passwordResetExpiresAt = undefined
    this.props.updatedAt = new Date()
  }

  updateProfile(name: string, metadata?: Record<string, unknown>): void {
    this.props.name = name
    if (metadata !== undefined) {
      this.props.metadata = metadata
    }
    this.props.updatedAt = new Date()
  }

  deactivate(): void {
    this.props.status = AdminStatus.INACTIVE
    this.props.updatedAt = new Date()
  }
}
