import { afterEach, beforeEach } from 'bun:test'
import { DB, Schema } from '@gravito/atlas'
import { createHttpTester, type HttpTester, type PlanetCore } from '@gravito/core'
import { HashManager } from '@gravito/sentinel'
import { bootstrap } from '../src/bootstrap'
import type { User } from '../src/Models/User'

export class TestCase {
  public core!: PlanetCore
  protected httpTester!: HttpTester

  /**
   * Setup the test environment
   */
  async setUp() {
    // Force SQLite in-memory for tests
    process.env.DB_CONNECTION = 'sqlite'
    process.env.DB_DATABASE = ':memory:'
    process.env.NODE_ENV = 'test'
    process.env.APP_KEY = 'base64:u696v2QpXkFv8/xYp6f9yR0i5f2Y9i6f8yR0i5f2Y9=' // Valid 32-byte key

    // Bootstrap the application
    this.core = await bootstrap()
    this.httpTester = createHttpTester(this.core)

    // Create Schema
    await this.createSchema()
  }

  /**
   * Tear down the test environment
   */
  async tearDown() {
    // Shutdown the app if needed
  }

  /**
   * Get the HttpTester instance
   */
  http(): HttpTester {
    return this.httpTester
  }

  /**
   * Helper to act as a user
   */
  async actingAs(user: User): Promise<this> {
    // In Gravito Sentinel with session driver, we need to set the session
    // For now, we'll simulate it via headers or direct session injection if possible
    // Alternatively, we can use the login route in the test itself
    return this
  }

  /**
   * Create the database schema
   */
  private async createSchema() {
    await Schema.dropIfExists('registration_values')
    await Schema.dropIfExists('registrations')
    await Schema.dropIfExists('registration_fields')
    await Schema.dropIfExists('sessions')
    await Schema.dropIfExists('events')
    await Schema.dropIfExists('users')

    await Schema.create('users', (table) => {
      table.id()
      table.string('name')
      table.string('email').unique()
      table.string('password')
      table.string('role')
      table.timestamps()
    })

    await Schema.create('events', (table) => {
      table.id()
      table.string('title')
      table.text('description')
      table.string('location')
      table.string('image_url').nullable()
      table.string('status')
      table.dateTime('registration_start')
      table.dateTime('registration_end')
      table.timestamps()
    })

    await Schema.create('sessions', (table) => {
      table.id()
      table.integer('event_id')
      table.string('title')
      table.dateTime('start_time')
      table.dateTime('end_time')
      table.integer('capacity')
      table.integer('registered_count').default(0)
      table.boolean('is_active').default(true)
      table.timestamps()
    })

    await Schema.create('registration_fields', (table) => {
      table.id()
      table.integer('event_id')
      table.string('name')
      table.string('label')
      table.string('type')
      table.text('options').nullable()
      table.boolean('required').default(false)
      table.integer('sort_order').default(0)
      table.timestamps()
    })

    await Schema.create('registrations', (table) => {
      table.id()
      table.integer('user_id')
      table.integer('session_id')
      table.string('status')
      table.string('qr_code').unique()
      table.text('notes').nullable()
      table.dateTime('registered_at')
      table.dateTime('confirmed_at').nullable()
      table.dateTime('checked_in_at').nullable()
      table.timestamps()
    })

    await Schema.create('registration_values', (table) => {
      table.id()
      table.integer('registration_id')
      table.integer('field_id')
      table.text('value')
      table.timestamps()
    })
  }
}

/**
 * Functional wrapper to use TestCase in bun:test
 */
export function itHasTestCase(callback: (t: TestCase) => void | Promise<void>) {
  const t = new TestCase()
  beforeEach(async () => {
    await t.setUp()
  })
  afterEach(async () => {
    await t.tearDown()
  })
  return callback(t)
}
