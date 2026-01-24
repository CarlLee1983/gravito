/**
 * Mock User Model for Testing
 */
export class MockUser {
  static records: Map<string, MockUser> = new Map()
  static nextId = 1

  id: string
  name: string
  email: string
  password: string
  email_verified_at: Date | null = null
  failed_login_attempts = 0
  locked_until: Date | null = null

  constructor(data: Partial<MockUser>) {
    this.id = data.id ?? String(MockUser.nextId++)
    this.name = data.name ?? ''
    this.email = data.email ?? ''
    this.password = data.password ?? ''
    this.email_verified_at = data.email_verified_at ?? null
    this.failed_login_attempts = data.failed_login_attempts ?? 0
    this.locked_until = data.locked_until ?? null
  }

  static async create(data: Partial<MockUser>): Promise<MockUser> {
    const user = new MockUser(data)
    MockUser.records.set(user.id, user)
    return user
  }

  static async find(id: string): Promise<MockUser | null> {
    return MockUser.records.get(id) ?? null
  }

  static query() {
    return {
      where: (_field: string, value: string) => ({
        first: async (): Promise<MockUser | null> => {
          return Array.from(MockUser.records.values()).find((u) => u.email === value) ?? null
        },
      }),
    }
  }

  async save(): Promise<void> {
    MockUser.records.set(this.id, this)
  }

  async update(data: Partial<MockUser>): Promise<void> {
    Object.assign(this, data)
    await this.save()
  }

  static reset(): void {
    MockUser.records.clear()
    MockUser.nextId = 1
  }
}

/**
 * Factory function to create mock users with sensible defaults
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return new MockUser({
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashed:password123',
    email_verified_at: new Date(),
    ...overrides,
  })
}
