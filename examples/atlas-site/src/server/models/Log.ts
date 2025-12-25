import { column, Model } from '@gravito/atlas'

export default class Log extends Model {
  static override connection = 'mongodb'
  static tableName = 'logs'
  static override primaryKey = '_id'

  @column({ isPrimary: true })
  declare _id: string | number

  @column()
  declare level: string

  @column()
  declare message: string

  @column()
  declare context?: Record<string, unknown> | null

  @column()
  declare created_at?: Date
}
