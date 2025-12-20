import { Model } from '@gravito/orbit-db'

export interface UserAttributes {
  id?: number
  name: string
  email: string
  created_at?: Date
  updated_at?: Date
}

export class User extends Model<UserAttributes> {
  public static override table = 'users'

  // Define fillable fields for mass assignment
  public static override fillable = ['name', 'email']
}
