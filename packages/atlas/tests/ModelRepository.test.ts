import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { column, DB, Model, ModelRepository, SQLiteDriver } from '../src/index'

/**
 * Test Models
 */
class TestUser extends Model {
  static table = 'test_users'

  @column({ isPrimary: true })
  get id(): number {
    return this._attributes.id as number
  }
  set id(value: number) {
    this._setAttribute('id', value)
  }

  @column()
  get name(): string {
    return this._attributes.name as string
  }
  set name(value: string) {
    this._setAttribute('name', value)
  }

  @column()
  get email(): string {
    return this._attributes.email as string
  }
  set email(value: string) {
    this._setAttribute('email', value)
  }

  @column()
  get is_active(): boolean {
    return (this._attributes.is_active as boolean) ?? true
  }
  set is_active(value: boolean) {
    this._setAttribute('is_active', value)
  }
}

/**
 * Test Repository
 */
class UserRepository extends ModelRepository<TestUser> {
  protected modelClass = TestUser

  async findByEmail(email: string): Promise<TestUser | null> {
    return this.findWhere('email', email)
  }

  async findActive(): Promise<TestUser[]> {
    return this.findManyWhere('is_active', true)
  }
}

/**
 * Tests
 */
describe('ModelRepository', () => {
  let userRepository: UserRepository

  beforeAll(async () => {
    // Configure in-memory SQLite
    DB.addConnection('default', {
      driver: 'sqlite',
      database: ':memory:',
    })

    userRepository = new UserRepository()

    // Create test table
    await DB.raw(`
      CREATE TABLE IF NOT EXISTS test_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
  })

  afterAll(async () => {
    await DB.raw('DROP TABLE IF EXISTS test_users')
  })

  it('should create a new record', async () => {
    const user = await userRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      is_active: true,
    } as any)

    expect(user).toBeDefined()
    expect(user.id).toBeDefined()
    expect(user.name).toBe('John Doe')
    expect(user.email).toBe('john@example.com')
  })

  it('should find a record by ID', async () => {
    const created = await userRepository.create({
      name: 'Jane Doe',
      email: 'jane@example.com',
      is_active: true,
    } as any)

    const found = await userRepository.find(created.id)
    expect(found).toBeDefined()
    expect(found?.email).toBe('jane@example.com')
  })

  it('should find a record by custom query', async () => {
    const user = await userRepository.findByEmail('john@example.com')
    expect(user).toBeDefined()
    expect(user?.name).toBe('John Doe')
  })

  it('should find multiple records by condition', async () => {
    await userRepository.create({
      name: 'Admin User',
      email: 'admin@example.com',
      is_active: true,
    } as any)

    const activeUsers = await userRepository.findActive()
    expect(activeUsers.length).toBeGreaterThan(0)
    activeUsers.forEach((user) => {
      // SQLite returns 1/0 for boolean, so we check if it's truthy
      expect(user.is_active).toBeTruthy()
    })
  })

  it('should update a record', async () => {
    const user = await userRepository.create({
      name: 'Original Name',
      email: 'update-test@example.com',
      is_active: true,
    } as any)

    const updated = await userRepository.update(user.id, {
      name: 'Updated Name',
    } as any)

    expect(updated.name).toBe('Updated Name')
  })

  it('should check if record exists', async () => {
    const user = await userRepository.create({
      name: 'Exists Test',
      email: 'exists@example.com',
      is_active: true,
    } as any)

    const exists = await userRepository.exists(user.id)
    expect(exists).toBe(true)

    const notExists = await userRepository.exists(9999)
    expect(notExists).toBe(false)
  })

  it('should count records', async () => {
    const countBefore = await userRepository.count()
    expect(countBefore).toBeGreaterThan(0)

    await userRepository.create({
      name: 'Count Test',
      email: 'count@example.com',
      is_active: true,
    } as any)

    const countAfter = await userRepository.count()
    expect(countAfter).toBe(countBefore + 1)
  })

  it('should retrieve all records', async () => {
    const allUsers = await userRepository.all()
    expect(allUsers.length).toBeGreaterThan(0)
  })

  it('should delete a record', async () => {
    const user = await userRepository.create({
      name: 'Delete Test',
      email: 'delete@example.com',
      is_active: true,
    } as any)

    await userRepository.delete(user.id)

    const deleted = await userRepository.find(user.id)
    expect(deleted).toBeNull()
  })

  it('should handle findOrFail correctly', async () => {
    const user = await userRepository.create({
      name: 'FindOrFail Test',
      email: 'findorfail@example.com',
      is_active: true,
    } as any)

    const found = await userRepository.findOrFail(user.id)
    expect(found.id).toBe(user.id)

    try {
      await userRepository.findOrFail(9999)
      expect.unreachable()
    } catch (e) {
      expect(e).toBeDefined()
    }
  })
})
