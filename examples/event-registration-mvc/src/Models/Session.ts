import { BelongsTo, column, HasMany, Model } from '@gravito/atlas'
import { Event } from './Event'
import { Registration } from './Registration'

export class Session extends Model {
  static table = 'sessions'

  @column({ isPrimary: true })
  get id(): number {
    return this._attributes.id as number
  }
  set id(value: number) {
    this._setAttribute('id', value)
  }

  @column()
  get event_id(): number {
    return this._attributes.event_id as number
  }
  set event_id(value: number) {
    this._setAttribute('event_id', value)
  }

  @column()
  get title(): string {
    return this._attributes.title as string
  }
  set title(value: string) {
    this._setAttribute('title', value)
  }

  @column()
  get start_time(): Date {
    return new Date(this._attributes.start_time as string | number | Date)
  }
  set start_time(value: Date | string) {
    this._setAttribute('start_time', value instanceof Date ? value.toISOString() : value)
  }

  @column()
  get end_time(): Date {
    return new Date(this._attributes.end_time as string | number | Date)
  }
  set end_time(value: Date | string) {
    this._setAttribute('end_time', value instanceof Date ? value.toISOString() : value)
  }

  @column()
  get capacity(): number {
    return this._attributes.capacity as number
  }
  set capacity(value: number) {
    this._setAttribute('capacity', value)
  }

  @column()
  get registered_count(): number {
    return (this._attributes.registered_count as number) || 0
  }
  set registered_count(value: number) {
    this._setAttribute('registered_count', value)
  }

  @column()
  get is_active(): boolean {
    return (this._attributes.is_active as boolean) ?? true
  }
  set is_active(value: boolean) {
    this._setAttribute('is_active', value)
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
  @BelongsTo(() => Event, { foreignKey: 'event_id' })
  event?: Event

  @HasMany(() => Registration, { foreignKey: 'session_id' })
  registrations?: Registration[]

  // Helper methods
  isFull(): boolean {
    return this.registered_count >= this.capacity
  }

  hasAvailableSlots(): boolean {
    return this.is_active && !this.isFull()
  }

  availableSlots(): number {
    return Math.max(0, this.capacity - this.registered_count)
  }
}
