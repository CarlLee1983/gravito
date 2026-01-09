import { type Blueprint, Schema } from '@gravito/atlas'

/**
 * Migration to create the members table with full features
 */
export default {
  async up() {
    await Schema.create('members', (table: Blueprint) => {
      table.string('id').primary()
      table.string('name')
      table.string('email').unique()
      table.string('password_hash')
      table.string('status').default('pending')
      table.text('roles').default('["member"]')
      table.string('verification_token').nullable()
      table.timestamp('email_verified_at').nullable()
      table.string('password_reset_token').nullable()
      table.timestamp('password_reset_expires_at').nullable()
      table.timestamp('created_at').default('CURRENT_TIMESTAMP')
      table.timestamp('updated_at').nullable()
      table.string('current_session_id').nullable()
      table.string('remember_token').nullable()
      table.text('metadata').nullable()
    })
  },

  async down() {
    await Schema.dropIfExists('members')
  },
}
