import { Migration } from '@gravito/atlas'

export const migrations = [
  {
    name: '2024_01_01_000000_create_users_table',
    up: async (schema: any) => {
      schema.createTable('users', (table: any) => {
        table.increments('id')
        table.string('name')
        table.string('email').unique()
        table.string('password')
        table.timestamp('email_verified_at').nullable()
        table.timestamps()
      })
    },
    down: async (schema: any) => {
      schema.dropTable('users')
    },
  },
] as Migration[]
