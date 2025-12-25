import { Photon } from '@gravito/photon'
import { DB } from './db.js' // Ensure .js extension for local imports in ESM/Bun
import User from './models/User.js'

const app = new Photon()

app.get('/api/demo', async (c) => {
  try {
    // Get recent users
    const users = await User.query().orderBy('id', 'desc').limit(5).get()

    // Get stats
    const totalUsers = await User.count()
    const totalPosts = await DB.table('posts').count()

    return c.json({
      success: true,
      executed_at: new Date().toISOString(),
      stats: {
        users: totalUsers,
        posts: totalPosts,
      },
      data: users,
    })
  } catch (err: any) {
    return c.json(
      {
        success: false,
        error: err.message,
      },
      500
    )
  }
})

const port = 3000
console.log(`🌌 Atlas Server running on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
