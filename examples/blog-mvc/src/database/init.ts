import { type Blueprint, DB, Schema } from '@gravito/atlas'
import type { PlanetCore } from '@gravito/core'
import { seedHighVolumeData } from './seeder'

export async function initializeDatabase(core: PlanetCore) {
  // 1. Categories Table
  if (!(await Schema.hasTable('categories'))) {
    await Schema.create('categories', (table: Blueprint) => {
      table.id()
      table.string('name')
      table.string('slug').unique()
      table.string('description').nullable()
      table.timestamps()
    })

    // Seed default categories
    await DB.table('categories').insert([
      {
        name: 'Engineering',
        slug: 'engineering',
        description: 'Technical deep dives into core systems.',
      },
      { name: 'Design', slug: 'design', description: 'UI/UX and aesthetic philosophy.' },
      { name: 'News', slug: 'news', description: 'Updates from the Gravito universe.' },
    ])
    console.log('📦 Categories seeded!')
  }

  // 2. Posts Table
  if (!(await Schema.hasTable('posts'))) {
    await Schema.create('posts', (table: Blueprint) => {
      table.id()
      table.integer('category_id').nullable()
      table.string('slug').unique()
      table.string('title')
      table.text('content')
      table.string('excerpt')
      table.string('author')
      table.string('status').default('published')
      table.string('feature_image').nullable()
      table.timestamp('published_at').nullable()
      table.timestamps()
    })
  } else {
    // Migration: Add columns if missing
    if (!(await Schema.hasColumn('posts', 'status'))) {
      await Schema.table('posts', (table: Blueprint) => {
        table.string('status').default('published')
        table.string('feature_image').nullable()
      })
      console.log('🔄 Posts table altered with status and feature_image')
    }
    // Migration: Add category_id if missing
    if (!(await Schema.hasColumn('posts', 'category_id'))) {
      await Schema.table('posts', (table: Blueprint) => {
        table.integer('category_id').nullable()
      })
      console.log('🔄 Posts table altered with category_id')
    }
  }

  // 3. Users Table (for Authentication)
  if (!(await Schema.hasTable('users'))) {
    await Schema.create('users', (table) => {
      table.id()
      table.string('name')
      table.string('email').unique()
      table.string('password')
      table.timestamps()
    })
  }

  // 4. Subscribers Table
  if (!(await Schema.hasTable('subscribers'))) {
    await Schema.create('subscribers', (table) => {
      table.id()
      table.string('email').unique()
      table.timestamps()
    })

    await DB.table('subscribers').insert([
      { email: 'user1@example.com' },
      { email: 'user2@example.com' },
    ])
  }

  // 5. Comments Table
  if (!(await Schema.hasTable('comments'))) {
    await Schema.create('comments', (table) => {
      table.id()
      table.integer('post_id')
      table.string('author_name')
      table.text('content')
      table.boolean('is_approved').default(false)
      table.timestamps()
    })
  }

  // 6. Tags Table
  if (!(await Schema.hasTable('tags'))) {
    await Schema.create('tags', (table) => {
      table.id()
      table.string('name')
      table.string('slug').unique()
      table.timestamps()
    })
    console.log('🏷️ Tags table created')
  }

  // 7. Post_Tags Pivot Table
  if (!(await Schema.hasTable('post_tags'))) {
    await Schema.create('post_tags', (table) => {
      table.id()
      table.integer('post_id')
      table.integer('tag_id')
    })
    console.log('🔗 Post_Tags table created')
  }

  // Seed Posts if empty
  const postCount = await DB.table('posts').count()
  if (postCount === 0) {
    const engCategory = await DB.table('categories').where('slug', 'engineering').first()
    const designCategory = await DB.table('categories').where('slug', 'design').first()

    await DB.table('posts').insert([
      {
        category_id: engCategory?.id,
        slug: 'hello-gravito',
        title: 'Hello Gravito MVC',
        excerpt: 'Welcome to the future of high-performance web development.',
        content:
          'This is the full content of the first post. Built with Gravito Planet Core and Atlas ORM.',
        author: 'Antigravity',
        status: 'published',
        feature_image:
          'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800',
        published_at: new Date(),
      },
      {
        category_id: designCategory?.id,
        slug: 'cyber-dark-aesthetics',
        title: 'Cyber Dark Aesthetics',
        excerpt: 'How to design interfaces that wow your users at first glance.',
        content:
          'Aesthetics are not just about looks; they are about the feeling of precision and performance.',
        author: 'Architect',
        status: 'published',
        feature_image:
          'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800',
        published_at: new Date(),
      },
    ])
    console.log('🌱 Posts seeded!')
  }

  // Seed Admin User if empty
  const userCount = await DB.table('users').count()
  if (userCount === 0) {
    const hashedPassword = await core.hasher.make('admin123')
    await DB.table('users').insert({
      name: 'Admin User',
      email: 'admin@gravito.dev',
      password: hashedPassword,
    })
    console.log('👤 Admin user seeded! (admin@gravito.dev / admin123)')
  }

  // 6. High Volume Data Seeding (for Stress Testing)
  await seedHighVolumeData()
}
