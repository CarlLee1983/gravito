/**
 * PostgresGrammar Tests
 */

import { describe, expect, it, beforeEach } from 'bun:test'
import { PostgresGrammar } from '../src/grammar/PostgresGrammar'
import type { CompiledQuery } from '../src/types'

describe('PostgresGrammar', () => {
    let grammar: PostgresGrammar

    beforeEach(() => {
        grammar = new PostgresGrammar()
    })

    // Helper to create a base compiled query
    const createQuery = (overrides: Partial<CompiledQuery> = {}): CompiledQuery => ({
        table: 'users',
        columns: ['*'],
        distinct: false,
        wheres: [],
        orders: [],
        groups: [],
        havings: [],
        joins: [],
        bindings: [],
        ...overrides,
    })

    describe('getPlaceholder', () => {
        it('should return PostgreSQL-style placeholders ($1, $2, etc)', () => {
            expect(grammar.getPlaceholder(0)).toBe('$1')
            expect(grammar.getPlaceholder(1)).toBe('$2')
            expect(grammar.getPlaceholder(9)).toBe('$10')
        })
    })

    describe('compileSelect', () => {
        it('should compile basic SELECT', () => {
            const query = createQuery()
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT * FROM "users"')
        })

        it('should compile SELECT with specific columns', () => {
            const query = createQuery({ columns: ['id', 'name', 'email'] })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT "id", "name", "email" FROM "users"')
        })

        it('should compile SELECT DISTINCT', () => {
            const query = createQuery({ distinct: true })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT DISTINCT * FROM "users"')
        })

        it('should compile SELECT with table.column format', () => {
            const query = createQuery({ columns: ['users.id', 'users.name'] })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT "users"."id", "users"."name" FROM "users"')
        })

        it('should handle column aliases', () => {
            const query = createQuery({ columns: ['name as user_name'] })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT "name" AS "user_name" FROM "users"')
        })
    })

    describe('compileSelect with WHERE', () => {
        it('should compile basic WHERE', () => {
            const query = createQuery({
                wheres: [{ type: 'basic', column: 'status', operator: '=', value: 'active', boolean: 'and' }],
                bindings: ['active'],
            })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT * FROM "users" WHERE "status" = $1')
        })

        it('should compile multiple WHERE with AND', () => {
            const query = createQuery({
                wheres: [
                    { type: 'basic', column: 'status', operator: '=', value: 'active', boolean: 'and' },
                    { type: 'basic', column: 'role', operator: '=', value: 'admin', boolean: 'and' },
                ],
                bindings: ['active', 'admin'],
            })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT * FROM "users" WHERE "status" = $1 AND "role" = $2')
        })

        it('should compile WHERE with OR', () => {
            const query = createQuery({
                wheres: [
                    { type: 'basic', column: 'status', operator: '=', value: 'active', boolean: 'and' },
                    { type: 'basic', column: 'status', operator: '=', value: 'pending', boolean: 'or' },
                ],
                bindings: ['active', 'pending'],
            })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT * FROM "users" WHERE "status" = $1 OR "status" = $2')
        })

        it('should compile WHERE IN', () => {
            const query = createQuery({
                wheres: [{ type: 'in', column: 'id', values: [1, 2, 3], boolean: 'and', not: false }],
                bindings: [1, 2, 3],
            })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT * FROM "users" WHERE "id" IN ($1, $2, $3)')
        })

        it('should compile WHERE NOT IN', () => {
            const query = createQuery({
                wheres: [{ type: 'in', column: 'id', values: [1, 2], boolean: 'and', not: true }],
                bindings: [1, 2],
            })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT * FROM "users" WHERE "id" NOT IN ($1, $2)')
        })

        it('should compile WHERE NULL', () => {
            const query = createQuery({
                wheres: [{ type: 'null', column: 'deleted_at', boolean: 'and', not: false }],
            })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT * FROM "users" WHERE "deleted_at" IS NULL')
        })

        it('should compile WHERE NOT NULL', () => {
            const query = createQuery({
                wheres: [{ type: 'null', column: 'email_verified_at', boolean: 'and', not: true }],
            })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT * FROM "users" WHERE "email_verified_at" IS NOT NULL')
        })

        it('should compile WHERE BETWEEN', () => {
            const query = createQuery({
                wheres: [{ type: 'between', column: 'age', values: [18, 65], boolean: 'and', not: false }],
                bindings: [18, 65],
            })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT * FROM "users" WHERE "age" BETWEEN $1 AND $2')
        })

        it('should compile WHERE raw', () => {
            const query = createQuery({
                wheres: [{ type: 'raw', sql: 'LOWER(email) = $1', boolean: 'and', bindings: ['test@example.com'] }],
            })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT * FROM "users" WHERE LOWER(email) = $1')
        })
    })

    describe('compileSelect with JOIN', () => {
        it('should compile INNER JOIN', () => {
            const query = createQuery({
                joins: [{ type: 'inner', table: 'posts', first: 'users.id', operator: '=', second: 'posts.user_id' }],
            })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT * FROM "users" INNER JOIN "posts" ON "users"."id" = "posts"."user_id"')
        })

        it('should compile LEFT JOIN', () => {
            const query = createQuery({
                joins: [{ type: 'left', table: 'posts', first: 'users.id', operator: '=', second: 'posts.user_id' }],
            })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT * FROM "users" LEFT JOIN "posts" ON "users"."id" = "posts"."user_id"')
        })

        it('should compile CROSS JOIN', () => {
            const query = createQuery({
                joins: [{ type: 'cross', table: 'settings', first: '', operator: '', second: '' }],
            })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT * FROM "users" CROSS JOIN "settings"')
        })
    })

    describe('compileSelect with ORDER BY', () => {
        it('should compile ORDER BY ASC', () => {
            const query = createQuery({
                orders: [{ column: 'name', direction: 'asc' }],
            })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT * FROM "users" ORDER BY "name" ASC')
        })

        it('should compile ORDER BY DESC', () => {
            const query = createQuery({
                orders: [{ column: 'created_at', direction: 'desc' }],
            })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT * FROM "users" ORDER BY "created_at" DESC')
        })

        it('should compile multiple ORDER BY', () => {
            const query = createQuery({
                orders: [
                    { column: 'status', direction: 'asc' },
                    { column: 'created_at', direction: 'desc' },
                ],
            })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT * FROM "users" ORDER BY "status" ASC, "created_at" DESC')
        })
    })

    describe('compileSelect with GROUP BY and HAVING', () => {
        it('should compile GROUP BY', () => {
            const query = createQuery({
                columns: ['status', 'COUNT(*) as count'],
                groups: ['status'],
            })
            const sql = grammar.compileSelect(query)
            expect(sql).toContain('GROUP BY "status"')
        })

        it('should compile HAVING', () => {
            const query = createQuery({
                groups: ['status'],
                havings: [{ type: 'basic', column: 'count', operator: '>', value: 5, boolean: 'and' }],
                bindings: [5],
            })
            const sql = grammar.compileSelect(query)
            expect(sql).toContain('HAVING "count" > $1')
        })
    })

    describe('compileSelect with LIMIT and OFFSET', () => {
        it('should compile LIMIT', () => {
            const query = createQuery({ limit: 10 })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT * FROM "users" LIMIT 10')
        })

        it('should compile OFFSET', () => {
            const query = createQuery({ offset: 20 })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT * FROM "users" OFFSET 20')
        })

        it('should compile LIMIT and OFFSET together', () => {
            const query = createQuery({ limit: 10, offset: 20 })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT * FROM "users" LIMIT 10 OFFSET 20')
        })
    })

    describe('compileInsert', () => {
        it('should compile basic INSERT', () => {
            const query = createQuery()
            const sql = grammar.compileInsert(query, [{ name: 'John', email: 'john@example.com' }])
            expect(sql).toBe('INSERT INTO "users" ("name", "email") VALUES ($1, $2) RETURNING *')
        })

        it('should compile INSERT with multiple rows', () => {
            const query = createQuery()
            const sql = grammar.compileInsert(query, [
                { name: 'John', email: 'john@example.com' },
                { name: 'Jane', email: 'jane@example.com' },
            ])
            expect(sql).toBe('INSERT INTO "users" ("name", "email") VALUES ($1, $2), ($3, $4) RETURNING *')
        })

        it('should compile INSERT with DEFAULT VALUES', () => {
            const query = createQuery()
            const sql = grammar.compileInsert(query, [])
            expect(sql).toBe('INSERT INTO "users" DEFAULT VALUES RETURNING *')
        })
    })

    describe('compileInsertGetId', () => {
        it('should compile INSERT with RETURNING id', () => {
            const query = createQuery()
            const sql = grammar.compileInsertGetId(query, { name: 'John' }, 'id')
            expect(sql).toBe('INSERT INTO "users" ("name") VALUES ($1) RETURNING "id"')
        })

        it('should compile INSERT with custom primary key', () => {
            const query = createQuery()
            const sql = grammar.compileInsertGetId(query, { name: 'John' }, 'user_id')
            expect(sql).toBe('INSERT INTO "users" ("name") VALUES ($1) RETURNING "user_id"')
        })
    })

    describe('compileUpdate', () => {
        it('should compile basic UPDATE', () => {
            const query = createQuery({
                wheres: [{ type: 'basic', column: 'id', operator: '=', value: 1, boolean: 'and' }],
                bindings: [1],
            })
            const sql = grammar.compileUpdate(query, { name: 'Updated Name' })
            expect(sql).toContain('UPDATE "users" SET "name" = $1')
            expect(sql).toContain('WHERE "id"')
        })
    })

    describe('compileDelete', () => {
        it('should compile DELETE without WHERE', () => {
            const query = createQuery()
            const sql = grammar.compileDelete(query)
            expect(sql).toBe('DELETE FROM "users"')
        })

        it('should compile DELETE with WHERE', () => {
            const query = createQuery({
                wheres: [{ type: 'basic', column: 'id', operator: '=', value: 1, boolean: 'and' }],
                bindings: [1],
            })
            const sql = grammar.compileDelete(query)
            expect(sql).toBe('DELETE FROM "users" WHERE "id" = $1')
        })
    })

    describe('compileTruncate', () => {
        it('should compile PostgreSQL TRUNCATE with CASCADE', () => {
            const query = createQuery()
            const sql = grammar.compileTruncate(query)
            expect(sql).toBe('TRUNCATE TABLE "users" RESTART IDENTITY CASCADE')
        })
    })

    describe('compileAggregate', () => {
        it('should compile COUNT(*)', () => {
            const query = createQuery()
            const sql = grammar.compileAggregate(query, { function: 'count', column: '*' })
            expect(sql).toBe('SELECT COUNT(*) AS "aggregate" FROM "users"')
        })

        it('should compile MAX', () => {
            const query = createQuery()
            const sql = grammar.compileAggregate(query, { function: 'max', column: 'age' })
            expect(sql).toBe('SELECT MAX("age") AS "aggregate" FROM "users"')
        })

        it('should compile aggregate with WHERE', () => {
            const query = createQuery({
                wheres: [{ type: 'basic', column: 'status', operator: '=', value: 'active', boolean: 'and' }],
                bindings: ['active'],
            })
            const sql = grammar.compileAggregate(query, { function: 'count', column: '*' })
            expect(sql).toContain('WHERE "status" = $1')
        })
    })

    describe('compileExists', () => {
        it('should compile EXISTS query', () => {
            const query = createQuery({
                wheres: [{ type: 'basic', column: 'email', operator: '=', value: 'test@example.com', boolean: 'and' }],
                bindings: ['test@example.com'],
            })
            const sql = grammar.compileExists(query)
            expect(sql).toContain('SELECT EXISTS(')
            expect(sql).toContain('AS "exists"')
        })
    })

    describe('wrapColumn', () => {
        it('should wrap column with double quotes', () => {
            expect(grammar.wrapColumn('name')).toBe('"name"')
        })

        it('should wrap table.column format', () => {
            expect(grammar.wrapColumn('users.name')).toBe('"users"."name"')
        })

        it('should not wrap asterisk', () => {
            expect(grammar.wrapColumn('*')).toBe('*')
        })

        it('should handle table.* format', () => {
            expect(grammar.wrapColumn('users.*')).toBe('"users".*')
        })
    })

    describe('wrapTable', () => {
        it('should wrap table name', () => {
            expect(grammar.wrapTable('users')).toBe('"users"')
        })

        it('should handle table alias', () => {
            expect(grammar.wrapTable('users as u')).toBe('"users" AS "u"')
        })
    })

    describe('quoteValue', () => {
        it('should quote strings', () => {
            expect(grammar.quoteValue('hello')).toBe("'hello'")
        })

        it('should escape single quotes', () => {
            expect(grammar.quoteValue("it's")).toBe("'it''s'")
        })

        it('should return NULL for null', () => {
            expect(grammar.quoteValue(null)).toBe('NULL')
        })

        it('should return boolean values', () => {
            expect(grammar.quoteValue(true)).toBe('TRUE')
            expect(grammar.quoteValue(false)).toBe('FALSE')
        })

        it('should return numbers as is', () => {
            expect(grammar.quoteValue(42)).toBe('42')
            expect(grammar.quoteValue(3.14)).toBe('3.14')
        })
    })

    describe('compileUpsert', () => {
        it('should compile ON CONFLICT DO UPDATE', () => {
            const query = createQuery()
            const sql = grammar.compileUpsert(
                query,
                [{ email: 'test@example.com', name: 'Test' }],
                ['email'],
                ['name']
            )
            expect(sql).toContain('ON CONFLICT ("email") DO UPDATE SET')
            expect(sql).toContain('"name" = EXCLUDED."name"')
        })

        it('should compile ON CONFLICT DO NOTHING', () => {
            const query = createQuery()
            const sql = grammar.compileUpsert(
                query,
                [{ email: 'test@example.com' }],
                ['email'],
                []
            )
            expect(sql).toContain('ON CONFLICT ("email") DO NOTHING')
        })
    })

    describe('compileLock', () => {
        it('should compile FOR UPDATE', () => {
            expect(grammar.compileLock('update')).toBe('FOR UPDATE')
        })

        it('should compile FOR SHARE', () => {
            expect(grammar.compileLock('share')).toBe('FOR SHARE')
        })
    })
})
