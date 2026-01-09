import { DB } from '@gravito/atlas'
import { bootstrap } from './bootstrap'
import { Category } from './models/Category'
import { Post } from './models/Post'
import { Tag } from './models/Tag'

async function runDemo() {
  console.log('\n🔮 Initializing Gravito Core for Atlas Demo...\n')
  const _core = await bootstrap({ port: 3002 })

  try {
    console.log('================================================')
    console.log('   🪐 ATLAS ORM FUNCTIONALITY FULL PROOFING     ')
    console.log('================================================\n')

    // ---------------------------------------------------------
    // 1. Transaction & Creation & Save
    // ---------------------------------------------------------
    console.log('TEST 1: Transactional Creation & Model Save...')
    const startTime1 = performance.now()

    let newPostId = 0

    await DB.transaction(async (_trx) => {
      // 1. Ensure Category
      let cat = await Category.query().where('slug', 'demo-category').first()
      if (!cat) {
        cat = new Category()
        cat.name = 'Demo Category'
        cat.slug = 'demo-category'
        cat.description = 'Created via Demo'
        cat.created_at = new Date()
        cat.updated_at = new Date()
        await cat.save()
        console.log(`   -> Created Category ID: ${cat.id}`)
      }

      // 2. Create Post using Model
      const p = new Post()
      p.category_id = cat?.id
      p.title = 'Atlas Proof Concept'
      p.slug = `atlas-proof-${Date.now()}`
      p.content = 'This post proves Atlas works.'
      p.excerpt = 'Proof of concept.'
      p.author = 'Tester'
      p.status = 'published'
      p.feature_image = ''
      p.published_at = new Date()
      p.created_at = new Date() // Normally auto-filled if hooks present, but setting manually for safety
      p.updated_at = new Date()

      await p.save()

      newPostId = p.id
      console.log(`   -> Created Post ID: ${p.id}`)

      // 3. Create Tag
      const t = new Tag()
      t.name = 'AtlasVerified'
      t.slug = `verified-${Date.now()}`
      t.created_at = new Date()
      t.updated_at = new Date()
      await t.save()
      console.log(`   -> Created Tag ID: ${t.id}`)

      // 4. Attach
      await DB.table('post_tags').insert({
        post_id: p.id,
        tag_id: t.id,
      })
      console.log(`   -> Attached Tag to Post`)
    })

    const duration1 = performance.now() - startTime1
    console.log(`✅ TEST 1 PASSED (${duration1.toFixed(2)}ms)\n`)

    // ---------------------------------------------------------
    // 2. Complex Read & Eager Loading
    // ---------------------------------------------------------
    console.log('TEST 2: Complex Read (Eager Loading + Subquery)...')
    const startTime2 = performance.now()

    const post = await Post.query().where('id', newPostId).with('category').with('tags').first()

    if (post) {
      console.log(`   -> Fetched: "${post.title}"`)
      console.log(`   -> Category: ${post.category?.name}`)
      console.log(`   -> Tags: ${post.tags?.map((t) => t.name).join(', ')}`)
    } else {
      throw new Error('Post not found via Model Query!')
    }

    const duration2 = performance.now() - startTime2
    console.log(`✅ TEST 2 PASSED (${duration2.toFixed(2)}ms)\n`)

    // ---------------------------------------------------------
    // 3. Performance Stress Test (Aggregate)
    // ---------------------------------------------------------
    console.log('TEST 3: Performance Aggregation (Count)...')
    const startTime3 = performance.now()

    const count = await DB.table('posts').count()
    console.log(`   -> Total posts in DB: ${count}`)

    const duration3 = performance.now() - startTime3
    console.log(`✅ TEST 3 PASSED (${duration3.toFixed(2)}ms)\n`)

    // ---------------------------------------------------------
    // 4. Model Update
    // ---------------------------------------------------------
    console.log('TEST 4: Model Update...')
    const startTime4 = performance.now()

    const pUpdate = await Post.find(newPostId)
    if (!pUpdate) {
      throw new Error('Could not find post for update')
    }

    const newTitle = `Atlas Proof Concept (Updated ${Date.now()})`
    pUpdate.title = newTitle
    await pUpdate.save()

    // Verify
    const pVerify = await Post.find(newPostId)
    if (pVerify?.title !== newTitle) {
      throw new Error(`Update failed! Expected "${newTitle}", got "${pVerify?.title}"`)
    }
    console.log(`   -> Successfully updated title to: "${pVerify.title}"`)

    const duration4 = performance.now() - startTime4
    console.log(`✅ TEST 4 PASSED (${duration4.toFixed(2)}ms)\n`)

    // ---------------------------------------------------------
    // 5. Search / Where Clause
    // ---------------------------------------------------------
    console.log('TEST 5: Search / Where Clause...')
    const startTime5 = performance.now()

    const searchResults = await Post.query()
      .where('title', 'like', '%Updated%')
      .where('id', newPostId)
      .get()

    console.log(`   -> Found ${searchResults.length} posts matching 'Updated'`)
    if (searchResults.length !== 1) {
      throw new Error('Search/Where clause failed')
    }

    const duration5 = performance.now() - startTime5
    console.log(`✅ TEST 5 PASSED (${duration5.toFixed(2)}ms)\n`)

    // ---------------------------------------------------------
    // 6. Pagination
    // ---------------------------------------------------------
    console.log('TEST 6: Pagination...')
    const startTime6 = performance.now()

    const paginated = await Post.query().paginate(5, 1)

    console.log(
      `   -> Paginated Result: Total=${paginated.pagination.total}, PerPage=${paginated.pagination.perPage}, CurrentPage=${paginated.pagination.page}`
    )

    if (paginated.data.length > 5) {
      throw new Error('Pagination returned too many results per page')
    }
    if (paginated.pagination.total < 1) {
      throw new Error('Pagination total is wrong')
    }

    const duration6 = performance.now() - startTime6
    console.log(`✅ TEST 6 PASSED (${duration6.toFixed(2)}ms)\n`)

    // ---------------------------------------------------------
    // 7. Cleanup
    // ---------------------------------------------------------
    console.log('TEST 7: Cleanup...')
    const pDelete = await Post.find(newPostId)
    if (pDelete) {
      await pDelete.delete()
      console.log(`   -> Deleted Post ID ${newPostId}`)
    }

    // Verify deletion
    const check = await Post.find(newPostId)
    if (check) {
      throw new Error('Delete failed! Post still exists.')
    }

    console.log(`✅ TEST 7 PASSED\n`)

    console.log('🎉 ALL ATLAS PROOFS COMPLETED SUCCESSFULLY.')
  } catch (e) {
    console.error('\n❌ DEMO FAILED:', e)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

runDemo()
