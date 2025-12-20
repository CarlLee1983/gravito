/**
 * MySQLGrammar Tests
 */

import { describe, expect, it, beforeEach } from 'bun:test'
import { MySQLGrammar } from '../src/grammar/MySQLGrammar'
import type { CompiledQuery } from '../src/types'

describe('MySQLGrammar', () => {
    let grammar: MySQLGrammar

    beforeEach(() => {
        grammar = new MySQLGrammar()
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
        it('should return ? for all indices', () => {
            expect(grammar.getPlaceholder(0)).toBe('?')
            expect(grammar.getPlaceholder(1)).toBe('?')
            expect(grammar.getPlaceholder(99)).toBe('?')
        })
    })

    describe('wrapColumn', () => {
        it('should wrap column with backticks', () => {
            expect(grammar.wrapColumn('name')).toBe('`name`')
        })

        it('should wrap table.column format', () => {
            expect(grammar.wrapColumn('users.name')).toBe('`users`.`name`')
        })

        it('should not wrap asterisk', () => {
            expect(grammar.wrapColumn('*')).toBe('*')
        })

        it('should handle table.* format', () => {
            expect(grammar.wrapColumn('users.*')).toBe('`users`.*')
        })
    })

    describe('wrapTable', () => {
        it('should wrap table name with backticks', () => {
            expect(grammar.wrapTable('users')).toBe('`users`')
        })

        it('should handle table alias', () => {
            expect(grammar.wrapTable('users as u')).toBe('`users` AS `u`')
        })
    })

    describe('compileSelect', () => {
        it('should compile basic SELECT with backticks', () => {
            const query = createQuery()
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT * FROM `users`')
        })

        it('should compile SELECT with specific columns', () => {
            const query = createQuery({ columns: ['id', 'name', 'email'] })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT `id`, `name`, `email` FROM `users`')
        })

        it('should compile SELECT with table.column', () => {
            const query = createQuery({ columns: ['users.id', 'users.name'] })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT `users`.`id`, `users`.`name` FROM `users`')
        })
    })

    describe('compileSelect with WHERE', () => {
        it('should compile basic WHERE with ?', () => {
            const query = createQuery({
                wheres: [{ type: 'basic', column: 'status', operator: '=', value: 'active', boolean: 'and' }],
                bindings: ['active'],
            })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT * FROM `users` WHERE `status` = ?')
        })

        it('should compile multiple WHERE with ?', () => {
            const query = createQuery({
                wheres: [
                    { type: 'basic', column: 'status', operator: '=', value: 'active', boolean: 'and' },
                    { type: 'basic', column: 'role', operator: '=', value: 'admin', boolean: 'and' },
                ],
                bindings: ['active', 'admin'],
            })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT * FROM `users` WHERE `status` = ? AND `role` = ?')
        })

        it('should compile WHERE IN with ?', () => {
            const query = createQuery({
                wheres: [{ type: 'in', column: 'id', values: [1, 2, 3], boolean: 'and', not: false }],
                bindings: [1, 2, 3],
            })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT * FROM `users` WHERE `id` IN (?, ?, ?)')
        })

        it('should compile WHERE BETWEEN with ?', () => {
            const query = createQuery({
                wheres: [{ type: 'between', column: 'age', values: [18, 65], boolean: 'and', not: false }],
                bindings: [18, 65],
            })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT * FROM `users` WHERE `age` BETWEEN ? AND ?')
        })
    })

    describe('compileSelect with JOIN', () => {
        it('should compile INNER JOIN with backticks', () => {
            const query = createQuery({
                joins: [{ type: 'inner', table: 'posts', first: 'users.id', operator: '=', second: 'posts.user_id' }],
            })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT * FROM `users` INNER JOIN `posts` ON `users`.`id` = `posts`.`user_id`')
        })
    })

    describe('compileSelect with ORDER BY', () => {
        it('should compile ORDER BY with backticks', () => {
            const query = createQuery({
                orders: [{ column: 'created_at', direction: 'desc' }],
            })
            const sql = grammar.compileSelect(query)
            expect(sql).toBe('SELECT * FROM `users` ORDER BY `created_at` DESC')
        })
    })

    describe('compileInsert', () => {
        it('should compile basic INSERT', () => {
            const query = createQuery()
            const sql = grammar.compileInsert(query, [{ name: 'John', email: 'john@example.com' }])
            expect(sql).toBe('INSERT INTO `users` (`name`, `email`) VALUES (?, ?)')
        })

        it('should compile INSERT with multiple rows', () => {
            const query = createQuery()
            const sql = grammar.compileInsert(query, [
                { name: 'John', email: 'john@example.com' },
                { name: 'Jane', email: 'jane@example.com' },
            ])
            expect(sql).toBe('INSERT INTO `users` (`name`, `email`) VALUES (?, ?), (?, ?)')
        })
    })

    describe('compileInsertGetId', () => {
        it('should compile INSERT (MySQL uses LAST_INSERT_ID after)', () => {
            const query = createQuery()
            const sql = grammar.compileInsertGetId(query, { name: 'John' }, 'id')
            // MySQL doesn't support RETURNING, just returns regular INSERT
            expect(sql).toBe('INSERT INTO `users` (`name`) VALUES (?)')
        })
    })

    describe('compileUpdate', () => {
        it('should compile basic UPDATE', () => {
            const query = createQuery({
                wheres: [{ type: 'basic', column: 'id', operator: '=', value: 1, boolean: 'and' }],
                bindings: [1],
            })
            const sql = grammar.compileUpdate(query, { name: 'Updated Name' })
            expect(sql).toContain('UPDATE `users` SET `name` = ?')
            expect(sql).toContain('WHERE `id`')
        })
    })

    describe('compileDelete', () => {
        it('should compile DELETE with backticks', () => {
            const query = createQuery({
                wheres: [{ type: 'basic', column: 'id', operator: '=', value: 1, boolean: 'and' }],
                bindings: [1],
            })
            const sql = grammar.compileDelete(query)
            expect(sql).toBe('DELETE FROM `users` WHERE `id` = ?')
        })
    })

    describe('compileTruncate', () => {
        it('should compile MySQL TRUNCATE', () => {
            const query = createQuery()
            const sql = grammar.compileTruncate(query)
            expect(sql).toBe('TRUNCATE TABLE `users`')
        })
    })

    describe('compileAggregate', () => {
        it('should compile COUNT with backticks', () => {
            const query = createQuery()
            const sql = grammar.compileAggregate(query, { function: 'count', column: '*' })
            expect(sql).toBe('SELECT COUNT(*) AS `aggregate` FROM `users`')
        })

        it('should compile MAX with backticks', () => {
            const query = createQuery()
            const sql = grammar.compileAggregate(query, { function: 'max', column: 'age' })
            expect(sql).toBe('SELECT MAX(`age`) AS `aggregate` FROM `users`')
        })
    })

    describe('compileExists', () => {
        it('should compile EXISTS with backticks', () => {
            const query = createQuery()
            const sql = grammar.compileExists(query)
            expect(sql).toContain('SELECT EXISTS(')
            expect(sql).toContain('AS `exists`')
        })
    })

    describe('compileUpsert', () => {
        it('should compile ON DUPLICATE KEY UPDATE', () => {
            const query = createQuery()
            const sql = grammar.compileUpsert(
                query,
                [{ email: 'test@example.com', name: 'Test' }],
                ['email'],
                ['name']
            )
            expect(sql).toContain('ON DUPLICATE KEY UPDATE')
            expect(sql).toContain('`name` = VALUES(`name`)')
        })

        it('should compile INSERT IGNORE when no update columns', () => {
            const query = createQuery()
            const sql = grammar.compileUpsert(
                query,
                [{ email: 'test@example.com' }],
                ['email'],
                []
            )
            expect(sql).toContain('INSERT IGNORE INTO')
        })
    })

    describe('compileLock', () => {
        it('should compile FOR UPDATE', () => {
            expect(grammar.compileLock('update')).toBe('FOR UPDATE')
        })

        it('should compile LOCK IN SHARE MODE', () => {
            expect(grammar.compileLock('share')).toBe('LOCK IN SHARE MODE')
        })
    })
})
