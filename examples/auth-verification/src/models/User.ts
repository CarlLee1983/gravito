import { Model } from '@gravito/atlas'

export class User extends Model {
  static table = 'users'

  static schema = {
    id: 'integer',
    name: 'string',
    email: 'string',
    password: 'string',
    role: 'string',
  }

  // Mock implementation for Atlas Model since we don't have a DB
  static async findBy(field: string, value: any): Promise<User | null> {
    const users = (global as any).MOCK_USERS || []
    const raw = users.find((u: any) => u[field] === value)
    if (!raw) {
      return null
    }
    const user = new User(raw)
    ;(user as any)._attributes = raw
    return user
  }

  static async create(data: any): Promise<User> {
    const id = Date.now()
    const attributes = { ...data, id }
    if (!(global as any).MOCK_USERS) {
      ;(global as any).MOCK_USERS = []
    }
    ;(global as any).MOCK_USERS.push(attributes)
    console.log(`[User Model] Created user: ${id} (${data.email})`)
    const user = new User(attributes)
    ;(user as any)._attributes = attributes
    return user
  }

  get id(): number {
    return (this as any)._attributes?.id
  }

  get name(): string {
    return (this as any)._attributes?.name
  }

  get email(): string {
    return (this as any)._attributes?.email
  }

  get role(): string {
    return (this as any)._attributes?.role
  }

  get password(): string {
    return (this as any)._attributes?.password
  }

  getAuthIdentifier(): string | number {
    return (this as any)._attributes?.id
  }

  getAuthPassword(): string {
    return (this as any).password
  }
}
