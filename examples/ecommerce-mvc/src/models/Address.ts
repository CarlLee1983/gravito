import { column, Model } from '@gravito/atlas'

export class Address extends Model {
  static table = 'addresses'

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
  get name(): string {
    return this._attributes.name as string
  }
  set name(value: string) {
    this._setAttribute('name', value)
  }

  @column()
  get phone(): string {
    return this._attributes.phone as string
  }
  set phone(value: string) {
    this._setAttribute('phone', value)
  }

  @column()
  get city(): string {
    return this._attributes.city as string
  }
  set city(value: string) {
    this._setAttribute('city', value)
  }

  @column()
  get district(): string {
    return this._attributes.district as string
  }
  set district(value: string) {
    this._setAttribute('district', value)
  }

  @column()
  get street(): string {
    return this._attributes.street as string
  }
  set street(value: string) {
    this._setAttribute('street', value)
  }

  @column()
  get zip_code(): string {
    return this._attributes.zip_code as string
  }
  set zip_code(value: string) {
    this._setAttribute('zip_code', value)
  }

  @column()
  get is_default(): boolean {
    return !!this._attributes.is_default
  }
  set is_default(value: boolean | number) {
    this._setAttribute('is_default', value ? 1 : 0)
  }

  @column()
  get created_at(): Date {
    return new Date(this._attributes.created_at as string | number | Date)
  }
  set created_at(value: Date | string) {
    this._setAttribute('created_at', value instanceof Date ? value.toISOString() : value)
  }

  @column()
  get updated_at(): Date {
    return new Date(this._attributes.updated_at as string | number | Date)
  }
  set updated_at(value: Date | string) {
    this._setAttribute('updated_at', value instanceof Date ? value.toISOString() : value)
  }

  get formattedAddress(): string {
    return `${this.zip_code} ${this.city}${this.district}${this.street}`
  }
}
