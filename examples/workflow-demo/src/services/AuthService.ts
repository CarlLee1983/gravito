import { randomUUID } from 'node:crypto'
import { DB } from '@gravito/atlas'

export type DemoUser = {
  id: string
  email: string
  name: string
}

type UserRow = DemoUser & {
  password: string
}

export class AuthService {
  async register(name: string, email: string, password: string): Promise<DemoUser> {
    const id = randomUUID()
    await DB.table('users').insert({
      id,
      name,
      email,
      password,
    })
    return { id, name, email }
  }

  async login(email: string, password: string): Promise<string | null> {
    const user = await this.findUserByEmail(email)
    if (!user || user.password !== password) {
      return null
    }
    const token = randomUUID()
    await DB.table('api_tokens').insert({
      id: randomUUID(),
      user_id: user.id,
      token,
    })
    return token
  }

  async findByToken(token: string): Promise<DemoUser | null> {
    const tokenRecord = await DB.table('api_tokens').where('token', token).first()
    if (!tokenRecord) {
      return null
    }
    const user = await DB.table<UserRow>('users').where('id', tokenRecord.user_id).first()
    if (!user) {
      return null
    }
    return this.sanitize(user)
  }

  async findByEmail(email: string): Promise<DemoUser | null> {
    const user = await this.findUserByEmail(email)
    if (!user) {
      return null
    }
    return this.sanitize(user)
  }

  private async findUserByEmail(email: string): Promise<UserRow | null> {
    return await DB.table<UserRow>('users').where('email', email).first()
  }

  private sanitize(user: UserRow): DemoUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    }
  }
}
