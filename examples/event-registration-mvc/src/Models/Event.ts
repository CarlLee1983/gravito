import { column, HasMany, Model } from '@gravito/atlas'
import { RegistrationField } from './RegistrationField'
import { Session } from './Session'

export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
}

export class Event extends Model {
  static table = 'events'

  @column({ isPrimary: true })
  get id(): number {
    return this._attributes.id as number
  }
  set id(value: number) {
    this._setAttribute('id', value)
  }

  @column()
  get title(): string {
    return this._attributes.title as string
  }
  set title(value: string) {
    this._setAttribute('title', value)
  }

  @column()
  get description(): string {
    return this._attributes.description as string
  }
  set description(value: string) {
    this._setAttribute('description', value)
  }

  @column()
  get location(): string {
    return this._attributes.location as string
  }
  set location(value: string) {
    this._setAttribute('location', value)
  }

  @column()
  get image_url(): string | undefined {
    return this._attributes.image_url as string | undefined
  }
  set image_url(value: string | undefined) {
    this._setAttribute('image_url', value)
  }

  @column()
  get status(): EventStatus {
    return (this._attributes.status as EventStatus) || EventStatus.DRAFT
  }
  set status(value: EventStatus) {
    this._setAttribute('status', value)
  }

  @column()
  get registration_start(): Date {
    return new Date(this._attributes.registration_start as string | number | Date)
  }
  set registration_start(value: Date | string) {
    this._setAttribute('registration_start', value instanceof Date ? value.toISOString() : value)
  }

  @column()
  get registration_end(): Date {
    return new Date(this._attributes.registration_end as string | number | Date)
  }
  set registration_end(value: Date | string) {
    this._setAttribute('registration_end', value instanceof Date ? value.toISOString() : value)
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
  @HasMany(() => Session, { foreignKey: 'event_id' })
  sessions?: Session[]

  @HasMany(() => RegistrationField, { foreignKey: 'event_id' })
  fields?: RegistrationField[]

  // Helper methods
  isPublished(): boolean {
    return this.status === EventStatus.PUBLISHED
  }

  isRegistrationOpen(): boolean {
    const now = new Date()
    return this.isPublished() && now >= this.registration_start && now <= this.registration_end
  }
}
