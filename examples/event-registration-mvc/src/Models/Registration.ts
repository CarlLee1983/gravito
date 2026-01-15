import { BelongsTo, column, HasMany, Model } from '@gravito/atlas'
import { RegistrationValue } from './RegistrationValue'
import { Session } from './Session'
import { User } from './User'

export enum RegistrationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  WAITLIST = 'waitlist',
  CHECKED_IN = 'checked_in',
}

export class Registration extends Model {
  static table = 'registrations'

  @column({ isPrimary: true })
  get id(): number {
    return this._attributes.id as number
  }
  set id(value: number) {
    this._setAttribute('id', value)
  }

  @column()
  get user_id(): number {
    return this._attributes.user_id as number
  }
  set user_id(value: number) {
    this._setAttribute('user_id', value)
  }

  @column()
  get session_id(): number {
    return this._attributes.session_id as number
  }
  set session_id(value: number) {
    this._setAttribute('session_id', value)
  }

  @column()
  get status(): RegistrationStatus {
    return (this._attributes.status as RegistrationStatus) || RegistrationStatus.PENDING
  }
  set status(value: RegistrationStatus) {
    this._setAttribute('status', value)
  }

  @column()
  get qr_code(): string {
    return this._attributes.qr_code as string
  }
  set qr_code(value: string) {
    this._setAttribute('qr_code', value)
  }

  @column()
  get notes(): string | undefined {
    return this._attributes.notes as string | undefined
  }
  set notes(value: string | undefined) {
    this._setAttribute('notes', value)
  }

  @column()
  get registered_at(): Date {
    return new Date(this._attributes.registered_at as string | number | Date)
  }
  set registered_at(value: Date | string) {
    this._setAttribute('registered_at', value instanceof Date ? value.toISOString() : value)
  }

  @column()
  get confirmed_at(): Date | undefined {
    const val = this._attributes.confirmed_at
    return val ? new Date(val as string | number | Date) : undefined
  }
  set confirmed_at(value: Date | string | undefined) {
    this._setAttribute('confirmed_at', value instanceof Date ? value.toISOString() : value)
  }

  @column()
  get checked_in_at(): Date | undefined {
    const val = this._attributes.checked_in_at
    return val ? new Date(val as string | number | Date) : undefined
  }
  set checked_in_at(value: Date | string | undefined) {
    this._setAttribute('checked_in_at', value instanceof Date ? value.toISOString() : value)
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

  // Relationships
  @BelongsTo(() => User, { foreignKey: 'user_id' })
  user?: User

  @BelongsTo(() => Session, { foreignKey: 'session_id' })
  session?: Session

  @HasMany(() => RegistrationValue, { foreignKey: 'registration_id' })
  values?: RegistrationValue[]

  // Helper methods
  isConfirmed(): boolean {
    return this.status === RegistrationStatus.CONFIRMED
  }

  isCheckedIn(): boolean {
    return this.status === RegistrationStatus.CHECKED_IN
  }

  canCheckIn(): boolean {
    return this.status === RegistrationStatus.CONFIRMED
  }
}
