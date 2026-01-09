import { DB } from '@gravito/atlas'

export async function seedHighVolumeData() {
  const postCount = await DB.table('posts').count()
  if (postCount > 100) {
    console.log('⚡ Skipping high volume seed (already has data)')
    return
  }

  console.log('🚀 Starting high volume seeding...')

  // 1. Create Tags
  const tags = [
    'Technology',
    'Design',
    'Culture',
    'Politics',
    'Science',
    'Health',
    'Style',
    'Travel',
    'React',
    'Vue',
    'Angular',
    'Svelte',
    'Node.js',
    'Bun',
    'Deno',
    'Rust',
    'Go',
    'Database',
    'SQL',
    'NoSQL',
    'Redis',
    'Mongo',
    'Postgres',
    'MySQL',
    'SQLite',
    'Performance',
    'Security',
    'DevOps',
    'Cloud',
    'Serverless',
    'Edge',
    'WASM',
    'AI',
    'ML',
    'LLM',
    'GPT',
    'Cyberpunk',
    'Futurism',
    'History',
    'Philosophy',
  ]

  const existingTagRows = await DB.table('tags').select('name').get()
  const existingTagNames = new Set(existingTagRows.map((r: any) => r.name))

  const tagsToInsert = tags
    .filter((t) => !existingTagNames.has(t))
    .map((t) => ({
      name: t,
      slug: t.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      created_at: new Date(),
      updated_at: new Date(), // updated_at is required
    }))

  if (tagsToInsert.length > 0) {
    await DB.table('tags').insert(tagsToInsert)
  }

  const allTags = await DB.table('tags').select('id').get()
  const tagIds = allTags.map((t: any) => t.id)

  // 2. Create 1000 Posts
  const categories = await DB.table('categories').select('id').get()
  const categoryIds = categories.map((c: any) => c.id)

  const postsToInsert: any[] = []
  const batchSize = 50 // SQLite limit considerations
  const totalPosts = 1000

  for (let i = 0; i < totalPosts; i++) {
    const title = `High Performance Blog Post ${i + 1} - ${Math.random().toString(36).substring(7)}`
    postsToInsert.push({
      category_id: categoryIds[Math.floor(Math.random() * categoryIds.length)],
      slug: `post-${i}-${Date.now()}`,
      title: title,
      excerpt: `This is a generated summary for post ${i + 1}. verifying performance.`,
      content: `Lorem ipsum content for post ${i + 1}. We are testing the Atlas ORM capabilities with large datasets.`,
      author: 'Seeder Bot',
      status: 'published',
      feature_image: null,
      created_at: new Date(),
      updated_at: new Date(),
      published_at: new Date(),
    })
  }

  // Chunk insert
  for (let i = 0; i < postsToInsert.length; i += batchSize) {
    const chunk = postsToInsert.slice(i, i + batchSize)
    await DB.table('posts').insert(chunk)
    if ((i + batchSize) % 200 === 0) {
      console.log(`... Inserted ${Math.min(i + batchSize, postsToInsert.length)} posts`)
    }
  }

  // 3. Attach Tags (Pivot)
  const allPosts = await DB.table('posts').select('id').get()
  const pivotEntries: any[] = []

  for (const post of allPosts) {
    // Randomly pick 2-5 tags
    const count = Math.floor(Math.random() * 4) + 2
    const shuffled = tagIds.sort(() => 0.5 - Math.random())
    const selected = shuffled.slice(0, count)

    for (const tagId of selected) {
      pivotEntries.push({
        post_id: post.id,
        tag_id: tagId,
      })
    }
  }

  // Chunk pivot insert
  console.log(`... Attaching ${pivotEntries.length} tags relations`)
  for (let i = 0; i < pivotEntries.length; i += batchSize) {
    const chunk = pivotEntries.slice(i, i + batchSize)
    await DB.table('post_tags').insert(chunk)
  }

  console.log('✅ High volume seeding complete!')
}
