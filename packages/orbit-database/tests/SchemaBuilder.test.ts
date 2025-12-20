/**
 * Schema Builder Tests
 */

import { describe, expect, it } from 'bun:test'
import { Blueprint, MySQLSchemaGrammar, PostgresSchemaGrammar } from '../src/schema'

describe('Blueprint', () => {
  describe('Column Types', () => {
    it('should create id column', () => {
      const blueprint = new Blueprint('users')
      blueprint.id()

      const columns = blueprint.getColumns()
      expect(columns).toHaveLength(1)
      expect(columns[0].name).toBe('id')
      expect(columns[0].type).toBe('bigInteger')
      expect(columns[0].isAutoIncrement()).toBe(true)
      expect(columns[0].isPrimary()).toBe(true)
      expect(columns[0].isUnsigned()).toBe(true)
    })

    it('should create string column with default length', () => {
      const blueprint = new Blueprint('users')
      blueprint.string('name')

      const columns = blueprint.getColumns()
      expect(columns[0].name).toBe('name')
      expect(columns[0].type).toBe('string')
      expect(columns[0].parameters.length).toBe(255)
    })

    it('should create string column with custom length', () => {
      const blueprint = new Blueprint('users')
      blueprint.string('name', 100)

      expect(blueprint.getColumns()[0].parameters.length).toBe(100)
    })

    it('should create timestamps', () => {
      const blueprint = new Blueprint('users')
      blueprint.timestamps()

      const columns = blueprint.getColumns()
      expect(columns).toHaveLength(2)
      expect(columns[0].name).toBe('created_at')
      expect(columns[1].name).toBe('updated_at')
      expect(columns[0].isNullable()).toBe(true)
    })

    it('should create softDeletes', () => {
      const blueprint = new Blueprint('users')
      blueprint.softDeletes()

      const columns = blueprint.getColumns()
      expect(columns[0].name).toBe('deleted_at')
      expect(columns[0].type).toBe('timestamp')
      expect(columns[0].isNullable()).toBe(true)
    })

    it('should create foreignId', () => {
      const blueprint = new Blueprint('posts')
      blueprint.foreignId('user_id')

      const columns = blueprint.getColumns()
      expect(columns[0].name).toBe('user_id')
      expect(columns[0].type).toBe('bigInteger')
      expect(columns[0].isUnsigned()).toBe(true)
    })
  })

  describe('Modifiers', () => {
    it('should apply nullable', () => {
      const blueprint = new Blueprint('users')
      blueprint.string('avatar').nullable()

      expect(blueprint.getColumns()[0].isNullable()).toBe(true)
    })

    it('should apply default value', () => {
      const blueprint = new Blueprint('users')
      blueprint.boolean('is_active').default(true)

      const col = blueprint.getColumns()[0]
      expect(col.hasDefaultValue()).toBe(true)
      expect(col.getDefault()).toBe(true)
    })

    it('should apply unique', () => {
      const blueprint = new Blueprint('users')
      blueprint.string('email').unique()

      expect(blueprint.getColumns()[0].isUnique()).toBe(true)
    })
  })

  describe('Foreign Keys', () => {
    it('should create constrained foreign key', () => {
      const blueprint = new Blueprint('posts')
      blueprint.foreignId('user_id').constrained()

      const fks = blueprint.getForeignKeys()
      expect(fks).toHaveLength(1)
      expect(fks[0].column).toBe('user_id')
      expect(fks[0].referencedTable).toBe('users')
      expect(fks[0].referencedColumn).toBe('id')
    })

    it('should create constrained foreign key with custom table', () => {
      const blueprint = new Blueprint('posts')
      blueprint.foreignId('author_id').constrained('users')

      const fks = blueprint.getForeignKeys()
      expect(fks[0].referencedTable).toBe('users')
    })

    it('should apply onDelete', () => {
      const blueprint = new Blueprint('posts')
      blueprint.foreignId('user_id').constrained().onDelete('cascade')

      const fks = blueprint.getForeignKeys()
      expect(fks[0].onDelete).toBe('cascade')
    })
  })

  describe('Indexes', () => {
    it('should add index', () => {
      const blueprint = new Blueprint('users')
      blueprint.index('email')

      const indexes = blueprint.getIndexes()
      expect(indexes).toHaveLength(1)
      expect(indexes[0].type).toBe('index')
      expect(indexes[0].columns).toEqual(['email'])
    })

    it('should add fulltext index', () => {
      const blueprint = new Blueprint('posts')
      blueprint.fullText('content', 'english')

      const indexes = blueprint.getIndexes()
      expect(indexes[0].type).toBe('fulltext')
      expect(indexes[0].language).toBe('english')
    })
  })
})

describe('PostgresSchemaGrammar', () => {
  const grammar = new PostgresSchemaGrammar()

  it('should compile CREATE TABLE', () => {
    const blueprint = new Blueprint('users')
    blueprint.id()
    blueprint.string('name')
    blueprint.string('email').unique()

    const sql = grammar.compileCreate(blueprint)

    expect(sql).toContain('CREATE TABLE "users"')
    expect(sql).toContain('"id" BIGSERIAL')
    expect(sql).toContain('"name" VARCHAR(255) NOT NULL')
    expect(sql).toContain('"email" VARCHAR(255) NOT NULL UNIQUE')
  })

  it('should compile DROP TABLE', () => {
    const sql = grammar.compileDrop('users')
    expect(sql).toBe('DROP TABLE "users"')
  })

  it('should compile DROP TABLE IF EXISTS', () => {
    const sql = grammar.compileDropIfExists('users')
    expect(sql).toBe('DROP TABLE IF EXISTS "users"')
  })

  it('should compile foreign key constraint', () => {
    const blueprint = new Blueprint('posts')
    blueprint.foreignId('user_id').constrained().onDelete('cascade')

    const sql = grammar.compileCreate(blueprint)

    expect(sql).toContain('CONSTRAINT fk_user_id FOREIGN KEY ("user_id")')
    expect(sql).toContain('REFERENCES "users" ("id")')
    expect(sql).toContain('ON DELETE CASCADE')
  })
})

describe('MySQLSchemaGrammar', () => {
  const grammar = new MySQLSchemaGrammar()

  it('should compile CREATE TABLE with backticks', () => {
    const blueprint = new Blueprint('users')
    blueprint.id()
    blueprint.string('name')

    const sql = grammar.compileCreate(blueprint)

    expect(sql).toContain('CREATE TABLE `users`')
    expect(sql).toContain('`id` BIGINT UNSIGNED AUTO_INCREMENT NOT NULL')
    expect(sql).toContain('`name` VARCHAR(255) NOT NULL')
  })

  it('should compile enum column', () => {
    const blueprint = new Blueprint('users')
    blueprint.enum('role', ['admin', 'user', 'guest'])

    const sql = grammar.compileCreate(blueprint)

    expect(sql).toContain("ENUM('admin', 'user', 'guest')")
  })
})
