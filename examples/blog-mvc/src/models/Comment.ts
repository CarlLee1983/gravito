import { column, Model } from '@gravito/atlas'

export class Comment extends Model {
  static table = 'comments'

  @column({ isPrimary: true })
  get id(): number {
    return this._attributes.id as number
  }
  set id(value: number) {
    this._setAttribute('id', value)
  }

  @column()
  get post_id(): number {
    return this._attributes.post_id as number
  }
  set post_id(value: number) {
    this._setAttribute('post_id', value)
  }

  @column()
  get author_name(): string {
    return this._attributes.author_name as string
  }
  set author_name(value: string) {
    this._setAttribute('author_name', value)
  }

  @column()
  get content(): string {
    return this._attributes.content as string
  }
  set content(value: string) {
    this._setAttribute('content', value)
  }

  @column()
  get is_approved(): boolean {
    const val = this._attributes.is_approved
    return val === 1 || val === '1' || val === true || val === 'true'
  }
  set is_approved(value: boolean | number) {
    this._setAttribute('is_approved', value)
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
}
