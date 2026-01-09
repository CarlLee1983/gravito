import { BelongsToMany, column, Model } from '@gravito/atlas'
import { Post } from './Post'

export class Tag extends Model {
  static table = 'tags'

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
  get slug(): string {
    return this._attributes.slug as string
  }
  set slug(value: string) {
    this._setAttribute('slug', value)
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

  @BelongsToMany(() => Post, { pivotTable: 'post_tags' })
  posts!: Post[]
}
