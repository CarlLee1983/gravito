/**
 * QueryBuilder Tests
 * Tests the fluent query builder interface
 */

import { describe, expect, it, beforeEach } from 'bun:test'
import { QueryBuilder, RecordNotFoundError, QueryBuilderError } from '../src/query/QueryBuilder'
import { PostgresGrammar } from '../src/grammar/PostgresGrammar'
import type { ConnectionContract, DriverContract, QueryResult } from '../src/types'

// Helper to create a mock connection
function createMockConnection(): ConnectionContract {
    const mockDriver: DriverContract = {
        getDriverName: () => 'postgres',
        connect: async () => { },
        disconnect: async () => { },
        isConnected: () => true,
        query: async () => ({ rows: [], rowCount: 0 }),
        execute: async () => ({ affectedRows: 0 }),
        beginTransaction: async () => { },
        commit: async () => { },
        rollback: async () => { },
        inTransaction: () => false,
    }

    return {
        getName: () => 'test',
        getDriver: () => mockDriver,
        getConfig: () => ({ driver: 'postgres' as const, database: 'test' }),
        table: <T>(_name: string) => new QueryBuilder<T>({} as ConnectionContract, new PostgresGrammar(), _name),
        raw: async <T>(_sql: string, _bindings?: unknown[]): Promise<QueryResult<T>> => ({ rows: [], rowCount: 0 }),
        transaction: async <T>(callback: (connection: ConnectionContract) => Promise<T>) => callback({} as ConnectionContract),
        disconnect: async () => { },
    }
}

describe('QueryBuilder', () => {
    let builder: QueryBuilder
    let grammar: PostgresGrammar
    let connection: ConnectionContract

    beforeEach(() => {
        grammar = new PostgresGrammar()
        connection = createMockConnection()
        builder = new QueryBuilder(connection, grammar, 'users')
    })

    describe('select', () => {
        it('should set columns to select', () => {
            builder.select('id', 'name', 'email')
            expect(builder.toSql()).toBe('SELECT "id", "name", "email" FROM "users"')
        })

        it('should default to * when no columns specified', () => {
            expect(builder.toSql()).toBe('SELECT * FROM "users"')
        })
    })

    describe('distinct', () => {
        it('should add DISTINCT to query', () => {
            builder.distinct()
            expect(builder.toSql()).toContain('SELECT DISTINCT')
        })
    })

    describe('where', () => {
        it('should add basic WHERE with 2 arguments', () => {
            builder.where('name', 'John')
            expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "name" = $1')
            expect(builder.getBindings()).toEqual(['John'])
        })

        it('should add basic WHERE with 3 arguments', () => {
            builder.where('age', '>', 18)
            expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "age" > $1')
            expect(builder.getBindings()).toEqual([18])
        })

        it('should add multiple WHERE clauses', () => {
            builder.where('status', 'active').where('role', 'admin')
            expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "status" = $1 AND "role" = $2')
            expect(builder.getBindings()).toEqual(['active', 'admin'])
        })

        it('should accept object of conditions', () => {
            builder.where({ status: 'active', role: 'admin' })
            expect(builder.toSql()).toContain('WHERE')
            expect(builder.getBindings()).toContain('active')
            expect(builder.getBindings()).toContain('admin')
        })
    })

    describe('orWhere', () => {
        it('should add OR WHERE clause', () => {
            builder.where('status', 'active').orWhere('status', 'pending')
            expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "status" = $1 OR "status" = $2')
        })
    })

    describe('whereIn', () => {
        it('should add WHERE IN clause', () => {
            builder.whereIn('id', [1, 2, 3])
            expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" IN ($1, $2, $3)')
            expect(builder.getBindings()).toEqual([1, 2, 3])
        })
    })

    describe('whereNotIn', () => {
        it('should add WHERE NOT IN clause', () => {
            builder.whereNotIn('id', [1, 2])
            expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" NOT IN ($1, $2)')
        })
    })

    describe('whereNull', () => {
        it('should add WHERE IS NULL clause', () => {
            builder.whereNull('deleted_at')
            expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "deleted_at" IS NULL')
        })
    })

    describe('whereNotNull', () => {
        it('should add WHERE IS NOT NULL clause', () => {
            builder.whereNotNull('email_verified_at')
            expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "email_verified_at" IS NOT NULL')
        })
    })

    describe('whereBetween', () => {
        it('should add WHERE BETWEEN clause', () => {
            builder.whereBetween('age', [18, 65])
            expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "age" BETWEEN $1 AND $2')
            expect(builder.getBindings()).toEqual([18, 65])
        })
    })

    describe('whereRaw', () => {
        it('should add raw WHERE clause', () => {
            builder.whereRaw('LOWER(email) = $1', ['test@example.com'])
            expect(builder.toSql()).toContain('LOWER(email) = $1')
            expect(builder.getBindings()).toEqual(['test@example.com'])
        })
    })

    describe('join', () => {
        it('should add INNER JOIN', () => {
            builder.join('posts', 'users.id', '=', 'posts.user_id')
            expect(builder.toSql()).toBe('SELECT * FROM "users" INNER JOIN "posts" ON "users"."id" = "posts"."user_id"')
        })
    })

    describe('leftJoin', () => {
        it('should add LEFT JOIN', () => {
            builder.leftJoin('posts', 'users.id', '=', 'posts.user_id')
            expect(builder.toSql()).toContain('LEFT JOIN "posts"')
        })
    })

    describe('rightJoin', () => {
        it('should add RIGHT JOIN', () => {
            builder.rightJoin('posts', 'users.id', '=', 'posts.user_id')
            expect(builder.toSql()).toContain('RIGHT JOIN "posts"')
        })
    })

    describe('crossJoin', () => {
        it('should add CROSS JOIN', () => {
            builder.crossJoin('settings')
            expect(builder.toSql()).toContain('CROSS JOIN "settings"')
        })
    })

    describe('orderBy', () => {
        it('should add ORDER BY ASC by default', () => {
            builder.orderBy('name')
            expect(builder.toSql()).toBe('SELECT * FROM "users" ORDER BY "name" ASC')
        })

        it('should add ORDER BY with direction', () => {
            builder.orderBy('created_at', 'desc')
            expect(builder.toSql()).toBe('SELECT * FROM "users" ORDER BY "created_at" DESC')
        })
    })

    describe('orderByDesc', () => {
        it('should add ORDER BY DESC', () => {
            builder.orderByDesc('id')
            expect(builder.toSql()).toBe('SELECT * FROM "users" ORDER BY "id" DESC')
        })
    })

    describe('latest', () => {
        it('should order by created_at DESC', () => {
            builder.latest()
            expect(builder.toSql()).toBe('SELECT * FROM "users" ORDER BY "created_at" DESC')
        })

        it('should use custom column', () => {
            builder.latest('updated_at')
            expect(builder.toSql()).toBe('SELECT * FROM "users" ORDER BY "updated_at" DESC')
        })
    })

    describe('oldest', () => {
        it('should order by created_at ASC', () => {
            builder.oldest()
            expect(builder.toSql()).toBe('SELECT * FROM "users" ORDER BY "created_at" ASC')
        })
    })

    describe('groupBy', () => {
        it('should add GROUP BY clause', () => {
            builder.groupBy('status')
            expect(builder.toSql()).toContain('GROUP BY "status"')
        })

        it('should add multiple GROUP BY columns', () => {
            builder.groupBy('status', 'role')
            expect(builder.toSql()).toContain('GROUP BY "status", "role"')
        })
    })

    describe('having', () => {
        it('should add HAVING clause', () => {
            builder.groupBy('status').having('count', '>', 5)
            expect(builder.toSql()).toContain('HAVING "count" > $1')
            expect(builder.getBindings()).toContain(5)
        })
    })

    describe('limit', () => {
        it('should add LIMIT clause', () => {
            builder.limit(10)
            expect(builder.toSql()).toBe('SELECT * FROM "users" LIMIT 10')
        })
    })

    describe('offset', () => {
        it('should add OFFSET clause', () => {
            builder.offset(20)
            expect(builder.toSql()).toBe('SELECT * FROM "users" OFFSET 20')
        })
    })

    describe('take and skip aliases', () => {
        it('take should alias limit', () => {
            builder.take(5)
            expect(builder.toSql()).toContain('LIMIT 5')
        })

        it('skip should alias offset', () => {
            builder.skip(10)
            expect(builder.toSql()).toContain('OFFSET 10')
        })
    })

    describe('toSql', () => {
        it('should return compiled SQL', () => {
            const sql = builder.where('id', 1).toSql()
            expect(sql).toBe('SELECT * FROM "users" WHERE "id" = $1')
        })
    })

    describe('getBindings', () => {
        it('should return bindings array', () => {
            builder.where('status', 'active').where('age', '>', 18)
            expect(builder.getBindings()).toEqual(['active', 18])
        })
    })

    describe('clone', () => {
        it('should create independent copy', () => {
            builder.where('status', 'active').limit(10)
            const cloned = builder.clone()

            // Modify original
            builder.where('role', 'admin')

            // Clone should not be affected
            expect(cloned.toSql()).not.toContain('role')
            expect(cloned.toSql()).toContain('status')
        })
    })

    describe('complex queries', () => {
        it('should build complex query with multiple clauses', () => {
            builder
                .select('id', 'name', 'email')
                .where('status', 'active')
                .whereNotNull('email_verified_at')
                .whereIn('role', ['admin', 'moderator'])
                .orderBy('name', 'asc')
                .limit(10)
                .offset(0)

            const sql = builder.toSql()
            expect(sql).toContain('SELECT "id", "name", "email"')
            expect(sql).toContain('WHERE "status" = $1')
            expect(sql).toContain('"email_verified_at" IS NOT NULL')
            expect(sql).toContain('"role" IN')
            expect(sql).toContain('ORDER BY "name" ASC')
            expect(sql).toContain('LIMIT 10')
        })

        it('should build query with join and conditions', () => {
            builder
                .select('users.name', 'posts.title')
                .join('posts', 'users.id', '=', 'posts.user_id')
                .where('posts.status', 'published')
                .orderByDesc('posts.created_at')
                .limit(5)

            const sql = builder.toSql()
            expect(sql).toContain('INNER JOIN "posts"')
            expect(sql).toContain('"posts"."status"')
        })
    })
})

describe('RecordNotFoundError', () => {
    it('should have correct name', () => {
        const error = new RecordNotFoundError()
        expect(error.name).toBe('RecordNotFoundError')
    })

    it('should have default message', () => {
        const error = new RecordNotFoundError()
        expect(error.message).toBe('Record not found')
    })

    it('should accept custom message', () => {
        const error = new RecordNotFoundError('User not found')
        expect(error.message).toBe('User not found')
    })
})

describe('QueryBuilderError', () => {
    it('should have correct name', () => {
        const error = new QueryBuilderError('Test error')
        expect(error.name).toBe('QueryBuilderError')
        expect(error.message).toBe('Test error')
    })
})
