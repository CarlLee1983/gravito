export default {
  defaults: {
    guard: 'web',
  },
  guards: {
    web: {
      driver: 'session',
      provider: 'users',
    },
  },
  providers: {
    users: {
      driver: 'database',
      model: 'User',
    },
  },
  passwords: {
    users: {
      provider: 'users',
      table: 'password_resets',
      expire: 60,
    },
  },
}
