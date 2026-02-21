/**
 * Tests: SchemaDiff + MigrationGenerator
 * @description Unit tests for schema diffing logic and SQL generation.
 */

import { describe, expect, it } from 'bun:test'
import { MigrationGenerator } from '../src/schema/MigrationGenerator'
import type { ColumnDefinition, SchemaDiffResult } from '../src/schema/SchemaDiff'

// ============================================================================
// Helpers
// ============================================================================

function makeCol(overrides: Partial<ColumnDefinition> = {}): ColumnDefinition {
  return {
    name: 'col',
    type: 'varchar',
    nullable: false,
    defaultValue: null,
    isPrimary: false,
    isUnique: false,
    ...overrides,
  }
}

function makeDiff(overrides: Partial<SchemaDiffResult> = {}): SchemaDiffResult {
  return {
    table: 'users',
    added: [],
    removed: [],
    modified: [],
    hasChanges: false,
    ...overrides,
  }
}

// ============================================================================
// MigrationGenerator - Postgres
// ============================================================================

describe('MigrationGenerator (postgres)', () => {
  const gen = new MigrationGenerator({ dialect: 'postgres' })

  it('returns empty array when no changes', () => {
    const diff = makeDiff({ hasChanges: false })
    expect(gen.generate(diff)).toEqual([])
  })

  it('generates ADD COLUMN for new columns', () => {
    const diff = makeDiff({
      hasChanges: true,
      added: [makeCol({ name: 'bio', type: 'text', nullable: true })],
    })
    const stmts = gen.generate(diff)
    expect(stmts.length).toBe(1)
    expect(stmts[0]).toContain('ADD COLUMN "bio" TEXT')
  })

  it('generates DROP COLUMN IF EXISTS for removed columns', () => {
    const diff = makeDiff({
      hasChanges: true,
      removed: [makeCol({ name: 'legacy_field' })],
    })
    const stmts = gen.generate(diff)
    expect(stmts[0]).toContain('DROP COLUMN IF EXISTS "legacy_field"')
  })

  it('generates ALTER COLUMN TYPE for modified columns', () => {
    const diff = makeDiff({
      hasChanges: true,
      modified: [
        {
          name: 'email',
          from: makeCol({ name: 'email', type: 'varchar', nullable: false }),
          to: makeCol({ name: 'email', type: 'text', nullable: false }),
        },
      ],
    })
    const stmts = gen.generate(diff)
    expect(stmts.some((s: string) => s.includes('ALTER COLUMN "email" TYPE TEXT'))).toBe(true)
  })

  it('generates SET NOT NULL when column becomes not nullable', () => {
    const diff = makeDiff({
      hasChanges: true,
      modified: [
        {
          name: 'phone',
          from: makeCol({ name: 'phone', type: 'varchar', nullable: true }),
          to: makeCol({ name: 'phone', type: 'varchar', nullable: false }),
        },
      ],
    })
    const stmts = gen.generate(diff)
    expect(stmts.some((s: string) => s.includes('SET NOT NULL'))).toBe(true)
  })

  it('generates DROP NOT NULL when column becomes nullable', () => {
    const diff = makeDiff({
      hasChanges: true,
      modified: [
        {
          name: 'phone',
          from: makeCol({ name: 'phone', type: 'varchar', nullable: false }),
          to: makeCol({ name: 'phone', type: 'varchar', nullable: true }),
        },
      ],
    })
    const stmts = gen.generate(diff)
    expect(stmts.some((s: string) => s.includes('DROP NOT NULL'))).toBe(true)
  })

  it('handles all three change types in one diff', () => {
    const diff = makeDiff({
      hasChanges: true,
      table: 'orders',
      added: [makeCol({ name: 'coupon_code', type: 'varchar' })],
      removed: [makeCol({ name: 'legacy_discount' })],
      modified: [
        {
          name: 'total',
          from: makeCol({ name: 'total', type: 'integer', nullable: false }),
          to: makeCol({ name: 'total', type: 'decimal', nullable: false }),
        },
      ],
    })
    const stmts = gen.generate(diff)
    expect(stmts.length).toBeGreaterThanOrEqual(3)
  })

  it('generates a complete migration script with up/down', () => {
    const diff = makeDiff({
      hasChanges: true,
      added: [makeCol({ name: 'score', type: 'integer' })],
    })
    const content = gen.generateMigrationScript(diff, 'add_score_to_users')
    expect(content).toContain('export async function up')
    expect(content).toContain('export async function down')
    expect(content).toContain('add_score_to_users')
    expect(content).toContain('ADD COLUMN')
  })
})

// ============================================================================
// MigrationGenerator - MySQL
// ============================================================================

describe('MigrationGenerator (mysql)', () => {
  const gen = new MigrationGenerator({ dialect: 'mysql' })

  it('generates ADD COLUMN with backtick quoting', () => {
    const diff = makeDiff({
      hasChanges: true,
      added: [makeCol({ name: 'description', type: 'text', nullable: true })],
    })
    const stmts = gen.generate(diff)
    expect(stmts[0]).toContain('ADD COLUMN `description`')
    expect(stmts[0]).toContain('TEXT')
  })

  it('generates DROP COLUMN without IF EXISTS for MySQL', () => {
    const diff = makeDiff({
      hasChanges: true,
      removed: [makeCol({ name: 'old_col' })],
    })
    const stmts = gen.generate(diff)
    expect(stmts[0]).toContain('DROP COLUMN `old_col`')
    // MySQL does not use IF EXISTS in ALTER TABLE DROP COLUMN
    expect(stmts[0]).not.toContain('IF EXISTS')
  })

  it('uses MODIFY COLUMN for type changes', () => {
    const diff = makeDiff({
      hasChanges: true,
      modified: [
        {
          name: 'description',
          from: makeCol({ name: 'description', type: 'varchar' }),
          to: makeCol({ name: 'description', type: 'text' }),
        },
      ],
    })
    const stmts = gen.generate(diff)
    expect(stmts[0]).toContain('MODIFY COLUMN `description` TEXT')
  })
})
