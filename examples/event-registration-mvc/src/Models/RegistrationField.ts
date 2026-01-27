import { BelongsTo, column, HasMany, Model } from '@gravito/atlas'
import { Event } from './Event'
import { RegistrationValue } from './RegistrationValue'

export enum FieldType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  SELECT = 'select',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
}

export class RegistrationField extends Model {
  static table = 'registration_fields'

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
  get name(): string {
    return this._attributes.name as string
  }
  set name(value: string) {
    this._setAttribute('name', value)
  }

  @column()
  get label(): string {
    return this._attributes.label as string
  }
  set label(value: string) {
    this._setAttribute('label', value)
  }

  @column()
  get type(): FieldType {
    return this._attributes.type as FieldType
  }
  set type(value: FieldType) {
    this._setAttribute('type', value)
  }

  @column()
  get options(): string | undefined {
    return this._attributes.options as string | undefined
  }
  set options(value: string | undefined) {
    this._setAttribute('options', value)
  }

  @column()
  get required(): boolean {
    return (this._attributes.required as boolean) ?? false
  }
  set required(value: boolean) {
    this._setAttribute('required', value)
  }

  @column()
  get sort_order(): number {
    return (this._attributes.sort_order as number) || 0
  }
  set sort_order(value: number) {
    this._setAttribute('sort_order', value)
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

  @HasMany(() => RegistrationValue, { foreignKey: 'field_id' })
  values?: RegistrationValue[]

  // Helper methods
  getOptions(): string[] {
    if (!this.options) return []
    try {
      return JSON.parse(this.options)
    } catch {
      return []
    }
  }

  setOptions(options: string[]): void {
    this.options = JSON.stringify(options)
  }
}
