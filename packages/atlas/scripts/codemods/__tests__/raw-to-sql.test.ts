/**
 * Tests for raw-to-sql codemod
 *
 * Tests cover:
 * - String literals
 * - Template literals
 * - Parameterized queries
 * - String concatenation (manual review cases)
 * - Edge cases
 */

import jscodeshift from 'jscodeshift'
import { describe, expect, it } from 'vitest'
import transform from '../raw-to-sql.codemod'

const j = jscodeshift.withParser('typescript')

function applyTransform(source: string): string {
  const fileInfo = {
    path: 'test.ts',
    source,
  }
  return transform(fileInfo as any, { jscodeshift: j } as any, {})
}

describe('raw-to-sql codemod', () => {
  describe('String literals', () => {
    it('converts simple string literal', () => {
      const input = `const result = db.raw('SELECT * FROM users')`
      const output = applyTransform(input)
      expect(output).toContain('db.sql`SELECT * FROM users`')
    })

    it('converts with JOIN', () => {
      const input = `
const result = db.raw('SELECT u.id, p.title FROM users u JOIN posts p ON u.id = p.authorId')
      `
      const output = applyTransform(input)
      expect(output).toContain(
        'db.sql`SELECT u.id, p.title FROM users u JOIN posts p ON u.id = p.authorId`'
      )
    })

    it('converts with WHERE clause', () => {
      const input = `const result = db.raw('SELECT * FROM users WHERE status = ?')`
      const output = applyTransform(input)
      expect(output).toContain('db.sql`SELECT * FROM users WHERE status = ?`')
    })

    it('preserves single quotes in SQL', () => {
      const input = `const result = db.raw("SELECT * FROM users WHERE name = 'John'")`
      const output = applyTransform(input)
      expect(output).toContain("db.sql`SELECT * FROM users WHERE name = 'John'`")
    })

    it('preserves special characters', () => {
      const input = `const result = db.raw('SELECT * FROM users WHERE email LIKE ?')`
      const output = applyTransform(input)
      expect(output).toContain('db.sql`SELECT * FROM users WHERE email LIKE ?`')
    })
  })

  describe('Template literals', () => {
    it('converts template literal without expressions', () => {
      const input = 'const result = db.raw(`SELECT * FROM users`)'
      const output = applyTransform(input)
      expect(output).toContain('db.sql`SELECT * FROM users`')
    })

    it('marks template with identifier for review', () => {
      const input = `const result = db.raw(\`SELECT * FROM \${tableName}\`)`
      const output = applyTransform(input)
      expect(output).toContain('TODO: Manual review')
      expect(output).toContain('unsafe expressions')
    })

    it('marks template with variable expression for review', () => {
      const input = `const result = db.raw(\`SELECT * FROM users WHERE id = \${userId}\`)`
      const output = applyTransform(input)
      expect(output).toContain('TODO: Manual review')
    })

    it('preserves safe template with parameter binding', () => {
      const input = `const query = db.raw(\`SELECT name FROM users WHERE id = ?\`)`
      const output = applyTransform(input)
      expect(output).toContain('db.sql')
    })

    it('marks template with call expression for review', () => {
      const input = `const result = db.raw(\`SELECT * FROM \${getTableName()}\`)`
      const output = applyTransform(input)
      expect(output).toContain('TODO: Manual review')
    })

    it('marks template with binary expression for review', () => {
      const input = `const result = db.raw(\`SELECT * FROM \${prefix + tableName}\`)`
      const output = applyTransform(input)
      expect(output).toContain('TODO: Manual review')
    })
  })

  describe('Parameterized queries', () => {
    it('converts parameterized query without placeholders', () => {
      const input = `const result = db.raw('SELECT * FROM users', [])`
      const output = applyTransform(input)
      expect(output).toContain('db.sql`SELECT * FROM users`')
    })

    it('marks parameterized query with ? for review', () => {
      const input = `const result = db.raw('SELECT * FROM users WHERE id = ?', [userId])`
      const output = applyTransform(input)
      expect(output).toContain('TODO: Manual review')
      expect(output).toContain('parameterized query')
    })

    it('marks multiple parameter placeholders for review', () => {
      const input = `const result = db.raw('SELECT * FROM users WHERE name = ? AND status = ?', [name, status])`
      const output = applyTransform(input)
      expect(output).toContain('TODO: Manual review')
    })

    it('marks IN clause with multiple parameters for review', () => {
      const input = `const result = db.raw('SELECT * FROM users WHERE id IN (?, ?, ?)', [id1, id2, id3])`
      const output = applyTransform(input)
      expect(output).toContain('TODO: Manual review')
    })
  })

  describe('String concatenation', () => {
    it('marks string concatenation for manual review', () => {
      const input = `const result = db.raw('SELECT * FROM ' + table + ' WHERE id = ?')`
      const output = applyTransform(input)
      expect(output).toContain('TODO: Manual review')
      expect(output).toContain('string concatenation')
    })

    it('marks concatenation with expressions for review', () => {
      const input = `const result = db.raw('SELECT * FROM users WHERE ' + condition)`
      const output = applyTransform(input)
      expect(output).toContain('TODO: Manual review')
    })
  })

  describe('Complex queries', () => {
    it('converts aggregate functions', () => {
      const input = `const result = db.raw('SELECT COUNT(*) as count FROM users')`
      const output = applyTransform(input)
      expect(output).toContain('COUNT(*)')
    })

    it('converts window functions', () => {
      const input = `const result = db.raw('SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn FROM users')`
      const output = applyTransform(input)
      expect(output).toContain('ROW_NUMBER()')
    })

    it('converts recursive CTEs', () => {
      const input = `const result = db.raw('WITH RECURSIVE cte AS (SELECT id FROM users) SELECT * FROM cte')`
      const output = applyTransform(input)
      expect(output).toContain('WITH RECURSIVE')
    })

    it('converts CASE expressions', () => {
      const input = `const result = db.raw('SELECT CASE WHEN status = 1 THEN active ELSE inactive END FROM users')`
      const output = applyTransform(input)
      expect(output).toContain('CASE WHEN')
    })

    it('converts subqueries', () => {
      const input = `const result = db.raw('SELECT * FROM users WHERE id IN (SELECT authorId FROM posts)')`
      const output = applyTransform(input)
      expect(output).toContain('SELECT authorId FROM posts')
    })
  })

  describe('Edge cases', () => {
    it('handles empty raw call', () => {
      const input = `const result = db.raw()`
      const output = applyTransform(input)
      expect(output).toBe(input)
    })

    it('preserves non-raw calls', () => {
      const input = `const result = db.query('SELECT * FROM users')`
      const output = applyTransform(input)
      expect(output).toBe(input)
    })

    it('handles multiple raw calls in file', () => {
      const input = `
        const users = db.raw('SELECT * FROM users')
        const posts = db.raw('SELECT * FROM posts')
      `
      const output = applyTransform(input)
      expect(output).toContain('db.sql`SELECT * FROM users`')
      expect(output).toContain('db.sql`SELECT * FROM posts`')
    })

    it('handles raw in variable assignment', () => {
      const input = `const query = db.raw('SELECT * FROM users WHERE active = true')`
      const output = applyTransform(input)
      expect(output).toContain('db.sql`SELECT * FROM users WHERE active = true`')
    })

    it('handles raw in function return', () => {
      const input = `
        function getUsers() {
          return db.raw('SELECT * FROM users')
        }
      `
      const output = applyTransform(input)
      expect(output).toContain('db.sql`SELECT * FROM users`')
    })

    it('handles raw in object literal', () => {
      const input = `
        const config = {
          query: db.raw('SELECT * FROM users'),
          timeout: 5000
        }
      `
      const output = applyTransform(input)
      expect(output).toContain('db.sql`SELECT * FROM users`')
    })

    it('handles raw as function argument', () => {
      const input = `
        const result = executeQuery(db.raw('SELECT * FROM users'))
      `
      const output = applyTransform(input)
      expect(output).toContain('db.sql`SELECT * FROM users`')
    })

    it('preserves code formatting', () => {
      const input = `
        const result = db.raw(
          'SELECT * FROM users WHERE active = true'
        )
      `
      const output = applyTransform(input)
      expect(output).toContain('db.sql')
    })

    it('handles multiline SQL', () => {
      const input = `const result = db.raw(\`
        SELECT *
        FROM users
        WHERE active = true
      \`)`
      const output = applyTransform(input)
      expect(output).toContain('db.sql')
    })

    it('preserves comments in code', () => {
      const input = `
        // Get all active users
        const result = db.raw('SELECT * FROM users WHERE active = true')
      `
      const output = applyTransform(input)
      expect(output).toContain('Get all active users')
      expect(output).toContain('db.sql')
    })
  })

  describe('Security considerations', () => {
    it('flags potential SQL injection in template', () => {
      const input = `const result = db.raw(\`SELECT * FROM users WHERE id = \${id}\`)`
      const output = applyTransform(input)
      // Should have manual review comment
      expect(output).toContain('TODO: Manual review')
    })

    it('marks concatenation patterns as risky', () => {
      const input = `const result = db.raw('WHERE status = ' + status)`
      const output = applyTransform(input)
      expect(output).toContain('TODO: Manual review')
    })

    it('converts safe direct literals', () => {
      const input = `const result = db.raw('SELECT * FROM users WHERE role = \\'admin\\'')`
      const output = applyTransform(input)
      expect(output).toContain('db.sql')
    })
  })

  describe('No-op transformations', () => {
    it('leaves already converted code unchanged', () => {
      const input = `const result = db.sql\`SELECT * FROM users\``
      const output = applyTransform(input)
      expect(output).toBe(input)
    })

    it('leaves non-database calls unchanged', () => {
      const input = `const result = logger.raw('Some log message')`
      const output = applyTransform(input)
      expect(output).toBe(input)
    })

    it('leaves variables named raw unchanged', () => {
      const input = `const raw = 'SELECT * FROM users'`
      const output = applyTransform(input)
      expect(output).toBe(input)
    })
  })
})
