import { Schema } from '@gravito/atlas'

export default class CreatePosts {
  async up() {
    await Schema.create('posts', (table) => {
      table.increments('id')
      table.integer('user_id').unsigned()
      table.string('title')
      table.text('content')
      table.boolean('is_published').default(false)
      table.timestamps()
      
      table.foreign('user_id').references('id').on('users').onDelete('cascade')
    })
  }

  async down() {
    await Schema.dropIfExists('posts')
  }
}