import { column, Model } from '@gravito/atlas'
import type { Authenticatable } from '@gravito/sentinel'

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export class User extends Model implements Authenticatable {
  static table = 'users'

  @column({ isPrimary: true })
  get id(): number {
    return this._attributes.id as number
  }
  set id(value: number) {
    this._setAttribute('id', value)
  }

  @column()
  get name(): string {
    return this._attributes.name as string
  }
  set name(value: string) {
    this._setAttribute('name', value)
  }

  @column()
  get email(): string {
    return this._attributes.email as string
  }
  set email(value: string) {
    this._setAttribute('email', value)
  }

  @column()
  get password(): string {
    return this._attributes.password as string
  }
  set password(value: string) {
    this._setAttribute('password', value)
  }

  @column()
  get role(): UserRole {
    return (this._attributes.role as UserRole) || UserRole.USER
  }
  set role(value: UserRole) {
    this._setAttribute('role', value)
  }

  @column({ autoCreate: true })
  get created_at(): Date {
    return new Date(this._attributes.created_at as string | number | Date)
  }
  set created_at(value: Date | string) {
    this._setAttribute('created_at', value instanceof Date ? value.toISOString() : value)
  }

  @column({ autoUpdate: true })
  get updated_at(): Date {
    return new Date(this._attributes.updated_at as string | number | Date)
  }
  set updated_at(value: Date | string) {
    this._setAttribute('updated_at', value instanceof Date ? value.toISOString() : value)
  }

  // Authenticatable Interface
  getAuthIdentifier(): string | number {
    return this.id
  }

  getAuthPassword(): string {
    return this.password
  }

  // Helper method to check if user is admin
  isAdmin(): boolean {
    return this.role === UserRole.ADMIN
  }
}
