import { DB, Schema, Model, column, HasMany } from '@gravito/atlas'

// --- Models ---
class User extends Model {
  static table = 'users'
  @column({ isPrimary: true }) declare id: number
  @column() declare name: string
  @column() declare email: string
  @HasMany(() => Post) declare posts: Post[]
}

class Post extends Model {
  static table = 'posts'
  @column({ isPrimary: true }) declare id: number
  @column() declare title: string
  @column() declare user_id: number
}

// --- Scenario ---
export async function runFeaturesScenario() {
  console.log('📦 Setting up Schema...')
  
  await Schema.dropIfExists('posts')
  await Schema.dropIfExists('users')

  await Schema.create('users', t => {
    t.id()
    t.string('name')
    t.string('email').unique()
    t.timestamps()
  })

  await Schema.create('posts', t => {
    t.id()
    t.string('title')
    t.foreignId('user_id').constrained()
    t.timestamps()
  })

  console.log('✨ Creating Data...')
  const user = new User()
  user.name = 'Benchmark User'
  user.email = 'bench@example.com'
  await user.save()

  // Relationship Create
  // (Assuming active record style relationship create isn't strictly necessary for test, manual for now)
  await DB.table('posts').insert({
      title: 'First Post',
      user_id: user.id,
      created_at: new Date(),
      updated_at: new Date()
  })

  console.log('🔍 Testing Eager Loading...')
  const fetchedUser = await User.with('posts').find(user.id)
  
  if (!fetchedUser?.posts || fetchedUser.posts.length !== 1) {
      throw new Error('Eager loading failed')
  }
  console.log('   ✅ HasMany Relation OK')

  console.log('🔍 Testing Scopes & Fluent Query...')
  const count = await User.query().where('email', 'like', '%bench%').count()
  if (count !== 1) throw new Error('Query builder count failed')
  console.log('   ✅ Query Builder OK')

  console.log('✅ Feature Parity Test Passed')
}
