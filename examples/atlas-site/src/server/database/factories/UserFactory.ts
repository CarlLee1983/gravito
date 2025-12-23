import { factory } from '@gravito/atlas'
import User from '../../models/User.js'
import { Fake } from './Fake.js'

export const UserFactory = factory(() => ({
  name: Fake.name(),
  email: Fake.email(),
  password: 'password123',
}), { model: User as any, table: 'users' })
