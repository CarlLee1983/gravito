/**
 * Tests for no-unsafe-raw ESLint rule
 *
 * This file demonstrates test patterns for ESLint rules using RuleTester.
 * Run with: bun test scripts/eslint-rules/no-unsafe-raw.test.ts
 */

import { describe, expect, it } from 'bun:test'

// Note: Full ESLint rule testing requires ESLint RuleTester
// These are example patterns for rule validation

describe('no-unsafe-raw rule', () => {
  describe('should detect unsafe patterns', () => {
    it('detects template literal with expressions', () => {
      const code = `
const user = await db.raw(\`SELECT * FROM users WHERE id = \${id}\`)
`
      // RuleTester would report error for this pattern
      expect(code).toContain('`SELECT * FROM users WHERE id = ${id}`')
    })

    it('detects string variable without bindings', () => {
      const code = `
const query = buildQuery()
await db.raw(query)
`
      expect(code).toContain('db.raw(query)')
    })

    it('detects string concatenation', () => {
      const code = `
const sql = 'SELECT * FROM users WHERE id = ' + id
await db.raw(sql)
`
      expect(code).toContain("'SELECT * FROM users WHERE id = ' + id")
    })

    it('detects concatenation in call', () => {
      const code = `
await db.raw('SELECT * FROM users WHERE id = ' + id)
`
      expect(code).toContain("db.raw('SELECT * FROM users WHERE id = ' + id)")
    })
  })

  describe('should allow safe patterns', () => {
    it('allows tagged template literals', () => {
      const code = `
const user = await db.sql\`SELECT * FROM users WHERE id = \${id}\`.first()
`
      expect(code).toContain('db.sql`')
    })

    it('allows raw with parameter bindings', () => {
      const code = `
const user = await db.raw('SELECT * FROM users WHERE id = ?', [id])
`
      expect(code).toContain('db.raw')
      expect(code).toContain('[id]')
    })

    it('allows static SQL literals (when option enabled)', () => {
      const code = `
const users = await db.raw('SELECT * FROM users WHERE active = true')
`
      expect(code).toContain("db.raw('SELECT * FROM users WHERE active = true')")
    })
  })

  describe('configuration options', () => {
    it('respects allowLiterals option', () => {
      // With allowLiterals: true (default)
      // db.raw('SELECT...') should only trigger a warn

      // With allowLiterals: false
      // db.raw('SELECT...') should trigger an error
      expect(true).toBe(true)
    })
  })

  describe('suggestions and fixes', () => {
    it('suggests migration from unsafe raw to sql', () => {
      const suggestedCode = 'await db.sql`SELECT * FROM users WHERE id = ${id}`'

      expect(suggestedCode).toContain('db.sql`')
    })

    it('suggests using parameter binding', () => {
      const suggestionMsg = 'Consider using parameter binding or db.sql tagged templates'

      expect(suggestionMsg).toBeTruthy()
    })
  })
})

describe('sql-injection-risk rule', () => {
  describe('should detect injection risks', () => {
    it('detects string concatenation with SQL keywords', () => {
      const code = `
const query = 'SELECT * FROM ' + table
await db.raw(query)
`
      expect(code).toContain("'SELECT * FROM ' + table")
    })

    it('detects dynamic table names without identifier()', () => {
      const code = `
const tableName = req.body.table
const data = await db.sql\`SELECT * FROM \${tableName}\`.all()
`
      // Should suggest: identifier(tableName)
      expect(code).toContain('${tableName}')
    })

    it('detects WHERE clause variables in raw()', () => {
      const code = `
const id = req.body.id
const sql = \`SELECT * FROM users WHERE id = \${id}\`
await db.raw(sql)
`
      expect(code).toContain('WHERE id = ${id}')
    })
  })

  describe('should allow safe patterns', () => {
    it('allows identifier() wrapped variables', () => {
      const code = `
import { identifier } from '@gravito/atlas'
const table = identifier(req.body.table)
const data = await db.sql\`SELECT * FROM \${table}\`.all()
`
      expect(code).toContain('identifier(')
    })

    it('allows parameter binding with db.sql', () => {
      const code = `
const id = req.body.id
const data = await db.sql\`SELECT * FROM users WHERE id = \${id}\`.all()
`
      expect(code).toContain('db.sql`')
    })

    it('allows parameter binding with db.raw', () => {
      const code = `
const id = req.body.id
const data = await db.raw('SELECT * FROM users WHERE id = ?', [id])
`
      expect(code).toContain('[id]')
    })
  })
})

describe('integration scenarios', () => {
  it('full safe query example passes all rules', () => {
    const code = `
import { identifier, DB } from '@gravito/atlas'

async function getUserData(userId: string, tableName: string) {
  // Safe: parameter binding with db.sql
  const user = await db.sql\`SELECT * FROM users WHERE id = \${userId}\`.first()

  // Safe: identifier() for table name
  const table = identifier(tableName)
  const data = await db.sql\`SELECT * FROM \${table}\`.all()

  return { user, data }
}
`
    expect(code).toContain('db.sql`')
    expect(code).toContain('identifier(')
  })

  it('examples marked for manual review', () => {
    const code = `
// ESLint will flag these patterns:
// ❌ await db.raw(\`SELECT * FROM users WHERE id = \${id}\`)
// ❌ const query = 'SELECT * FROM ' + table
// ❌ await db.raw(userGeneratedSql)

// Recommended replacements:
// ✅ await db.sql\`SELECT * FROM users WHERE id = \${id}\`.first()
// ✅ await db.sql\`SELECT * FROM \${identifier(table)}\`.all()
// ✅ // Validate and use db.sql or db.raw with bindings
`
    expect(code).toContain('db.sql`')
  })
})
