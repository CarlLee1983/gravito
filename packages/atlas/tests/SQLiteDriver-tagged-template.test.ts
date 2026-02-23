import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { SQLiteDriver } from '../src/drivers/SQLiteDriver'

describe('SQLiteDriver Tagged Template Literals', () => {
  let driver: SQLiteDriver

  beforeEach(async () => {
    driver = new SQLiteDriver({
      driver: 'sqlite',
      database: ':memory:',
    })
    await driver.connect()

    // Create test table through the driver
    await driver.execute(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        age INTEGER
      )
    `)
  })

  afterEach(async () => {
    await driver.disconnect()
  })

  it('should execute SELECT queries with sql tagged template', async () => {
    // Insert test data
    await driver.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
      'Alice',
      'alice@example.com',
      30,
    ])

    // Use sql tagged template
    const userId = 1
    const result = await driver.sql`SELECT * FROM users WHERE id = ${userId}`

    expect(result.rows).toHaveLength(1)
    expect((result.rows[0] as any).name).toBe('Alice')
    expect((result.rows[0] as any).age).toBe(30)
  })

  it('should prevent SQL injection with sql tagged template', async () => {
    // Insert test data
    await driver.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
      'Bob',
      'bob@example.com',
      25,
    ])
    await driver.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
      'Charlie',
      'charlie@example.com',
      35,
    ])

    // Try SQL injection - should be safely parameterized
    const injection = "'; DROP TABLE users; --"
    const result = await driver.sql`SELECT * FROM users WHERE name = ${injection}`

    // Table should still exist and no rows should match the injection string
    expect(result.rows).toHaveLength(0)

    // Verify table still exists
    const allUsers = await driver.sql`SELECT COUNT(*) as count FROM users`
    expect((allUsers.rows[0] as any).count).toBe(2)
  })

  it('should execute INSERT queries with sqlExecute tagged template', async () => {
    const name = 'David'
    const email = 'david@example.com'
    const age = 28

    const result = await driver.sqlExecute`
      INSERT INTO users (name, email, age) VALUES (${name}, ${email}, ${age})
    `

    expect(result.affectedRows).toBe(1)

    // Verify insert worked
    const query = await driver.sql`SELECT * FROM users WHERE name = ${name}`
    expect(query.rows).toHaveLength(1)
    expect((query.rows[0] as any).email).toBe(email)
  })

  it('should execute UPDATE queries with sqlExecute tagged template', async () => {
    // Insert initial data
    await driver.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
      'Eve',
      'eve@example.com',
      26,
    ])

    // Update using tagged template
    const newAge = 27
    const userId = 1
    const updateResult = await driver.sqlExecute`
      UPDATE users SET age = ${newAge} WHERE id = ${userId}
    `

    expect(updateResult.affectedRows).toBe(1)

    // Verify update worked
    const query = await driver.sql`SELECT age FROM users WHERE id = ${userId}`
    expect((query.rows[0] as any).age).toBe(newAge)
  })

  it('should execute DELETE queries with sqlExecute tagged template', async () => {
    // Insert test data
    await driver.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
      'Frank',
      'frank@example.com',
      32,
    ])

    // Delete using tagged template
    const userId = 1
    const deleteResult = await driver.sqlExecute`DELETE FROM users WHERE id = ${userId}`

    expect(deleteResult.affectedRows).toBe(1)

    // Verify delete worked
    const query = await driver.sql`SELECT COUNT(*) as count FROM users`
    expect((query.rows[0] as any).count).toBe(0)
  })

  it('should handle multiple parameters safely', async () => {
    // Insert multiple records
    await driver.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
      'Grace',
      'grace@example.com',
      24,
    ])
    await driver.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
      'Henry',
      'henry@example.com',
      28,
    ])
    await driver.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
      'Iris',
      'iris@example.com',
      31,
    ])

    // Query with multiple parameters (BETWEEN is inclusive on both ends)
    const minAge = 24
    const maxAge = 29
    const result = await driver.sql`
      SELECT * FROM users WHERE age BETWEEN ${minAge} AND ${maxAge} ORDER BY age
    `

    expect(result.rows).toHaveLength(2)
    expect((result.rows[0] as any).name).toBe('Grace')
    expect((result.rows[1] as any).name).toBe('Henry')
  })

  it('should work with LIKE operator and wildcards', async () => {
    // Insert test data
    await driver.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
      'Jack',
      'jack@example.com',
      29,
    ])
    await driver.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
      'Jill',
      'jill@example.com',
      27,
    ])
    await driver.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
      'Kate',
      'kate@example.com',
      26,
    ])

    // Query using LIKE
    const pattern = 'J%'
    const result = await driver.sql`SELECT * FROM users WHERE name LIKE ${pattern} ORDER BY name`

    expect(result.rows).toHaveLength(2)
    expect((result.rows[0] as any).name).toBe('Jack')
    expect((result.rows[1] as any).name).toBe('Jill')
  })

  it('should handle null values safely', async () => {
    // Insert record with null age
    await driver.execute('INSERT INTO users (name, email) VALUES (?, ?)', [
      'Leo',
      'leo@example.com',
    ])
    await driver.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
      'Luna',
      'luna@example.com',
      25,
    ])

    // Query for non-null values (to verify parameterization)
    const targetAge = 25
    const result = await driver.sql`SELECT * FROM users WHERE age = ${targetAge}`

    expect(result.rows).toHaveLength(1)
    expect((result.rows[0] as any).name).toBe('Luna')
    expect((result.rows[0] as any).age).toBe(25)

    // Also verify NULL record exists with IS NULL (SQL standard)
    const nullResult = await driver.sql`SELECT * FROM users WHERE age IS NULL`
    expect(nullResult.rows).toHaveLength(1)
    expect((nullResult.rows[0] as any).name).toBe('Leo')
    expect((nullResult.rows[0] as any).age).toBeNull()
  })

  it('should work with transactions', async () => {
    await driver.beginTransaction()

    const name = 'Mary'
    const email = 'mary@example.com'
    const age = 33

    await driver.sqlExecute`
      INSERT INTO users (name, email, age) VALUES (${name}, ${email}, ${age})
    `

    const query = await driver.sql`SELECT * FROM users WHERE name = ${name}`
    expect(query.rows).toHaveLength(1)

    await driver.commit()

    // Verify data persisted
    const final = await driver.sql`SELECT COUNT(*) as count FROM users`
    expect((final.rows[0] as any).count).toBe(1)
  })
})
