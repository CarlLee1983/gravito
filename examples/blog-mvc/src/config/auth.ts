import { app } from '@gravito/core'
import { User } from '../models/User'

export const authConfig = {
  defaults: {
    guard: 'web',
    passwords: 'users',
  },
  guards: {
    web: {
      driver: 'session',
      provider: 'users',
    },
  },
  providers: {
    users: {
      driver: 'callback',
    },
  },
  bindings: {
    providers: {
      users: (_config: Record<string, any>) => ({
        async retrieveById(id: string | number) {
          return await User.find(id)
        },
        async retrieveByCredentials(credentials: Record<string, any>) {
          if (!credentials.email) {
            return null
          }
          return await User.query().where('email', credentials.email).first()
        },
        async validateCredentials(user: any, credentials: Record<string, any>) {
          const core = app()
          return await core.hasher.check(credentials.password as string, (user as any).password)
        },
      }),
    },
  },
}
