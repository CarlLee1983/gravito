import { type Blueprint, Schema } from '@gravito/atlas'

/**
 * Migration to create the member_passkeys table for storing WebAuthn credentials
 */
export default {
  async up() {
    await Schema.create('member_passkeys', (table: Blueprint) => {
      table.string('id').primary()
      table.string('member_id')
      table.foreign('member_id').references('id').on('members').onDelete('cascade')
      table.string('credential_id').unique()
      table.text('public_key')
      table.bigInteger('counter').default(0)
      table.text('transports').nullable()
      table.string('display_name').nullable()
      table.timestamp('created_at').default('CURRENT_TIMESTAMP')
      table.timestamp('updated_at').nullable()
    })
  },

  async down() {
    await Schema.dropIfExists('member_passkeys')
  },
}
