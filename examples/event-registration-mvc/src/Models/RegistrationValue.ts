import { BelongsTo, column, Model } from '@gravito/atlas'
import { Registration } from './Registration'
import { RegistrationField } from './RegistrationField'

export class RegistrationValue extends Model {
  static table = 'registration_values'

  @column({ isPrimary: true })
  get id(): number {
    return this._attributes.id as number
  }
  set id(value: number) {
    this._setAttribute('id', value)
  }

  @column()
  get registration_id(): number {
    return this._attributes.registration_id as number
  }
  set registration_id(value: number) {
    this._setAttribute('registration_id', value)
  }

  @column()
  get field_id(): number {
    return this._attributes.field_id as number
  }
  set field_id(value: number) {
    this._setAttribute('field_id', value)
  }

  @column()
  get value(): string {
    return this._attributes.value as string
  }
  set value(val: string) {
    this._setAttribute('value', val)
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
  @BelongsTo(() => Registration, { foreignKey: 'registration_id' })
  registration?: any

  @BelongsTo(() => RegistrationField, { foreignKey: 'field_id' })
  field?: any
}
