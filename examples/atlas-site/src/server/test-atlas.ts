import { DB } from './db.js'
import { Migrator } from '@gravito/atlas'
import path from 'path'
import { fileURLToPath } from 'url'
import { run as runSeeder } from './database/seeders/MainSeeder.js'
import User from './models/User.js'
import Post from './models/Post.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function main() {
    console.log('🚀 Starting Atlas Test...')
    
    // 1. Run Migrations
    const migrator = new Migrator({
        path: path.join(__dirname, 'database/migrations'),
        connection: 'sqlite'
    })
    
    console.log('📦 Migrating database (fresh)...')
    await migrator.fresh()
    
    // 2. Run Seeder
    await runSeeder()
    
    // 3. Verification Queries
    console.log('\n🔍 Verifying Data...')
    
    // Count
    const userCount = await User.count()
    console.log(`User Count: ${userCount}`)
    
    const postCount = await Post.count()
    console.log(`Post Count: ${postCount}`)
    
    // Find First
    const firstUser = await User.first()
    if (firstUser) {
        console.log('\n👤 First User:', firstUser.toJSON())
        
        // Load Posts manually via helper
        const posts = await firstUser.hasMany(Post).get()
        console.log(`   Has ${posts.length} posts (loaded manually)`)
    }
    
    // Query Builder with Relation
    const activeUsers = await User.query()
        .where('email', 'like', '%@example.com')
        .limit(3)
        .get()
        
    console.log(`\n📋 Found ${activeUsers.length} users via QueryBuilder`)
    
    // Create new
    console.log('\n✨ Creating new user...')
    const newUser = new User()
    newUser.name = 'Test User'
    newUser.email = `test${Date.now()}@test.com`
    newUser.password = 'secret'
    await newUser.save()
    console.log('   User created with ID:', newUser.id)
    
    // Update
    console.log('   Updating user...')
    newUser.name = 'Updated Name'
    await newUser.save()
    console.log('   User updated:', newUser.name)
    
    // Delete
    console.log('   Deleting user...')
    await newUser.delete()
    console.log('   User deleted')
    
    console.log('\n✅ Test Complete!')
}

main().catch(console.error).finally(() => {
    DB.disconnectAll()
})
