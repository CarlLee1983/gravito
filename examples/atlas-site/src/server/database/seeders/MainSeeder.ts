import { UserFactory } from '../factories/UserFactory.js'
import { PostFactory } from '../factories/PostFactory.js'

export async function run() {
  console.log('🌱 Seeding database...')

  // Create 10 users
  const users = await UserFactory.count(10).create()
  console.log(`✅ Created ${users.length} users`)

  // Create posts for each user
  for (const user of users) {
     const postCount = Math.floor(Math.random() * 5) + 1
     await PostFactory
        .count(postCount)
        .state({ user_id: (user as any).id })
        .create()
  }
  console.log('✅ Created posts for users')
}
