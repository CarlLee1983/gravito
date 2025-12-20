/**
 * Seed System Tests
 */

import { describe, expect, it } from 'bun:test'
import { Factory, factory, SeederRunner } from '../src/seed'

describe('Factory', () => {
    describe('make', () => {
        it('should create records using definition', () => {
            const userFactory = new Factory(() => ({
                name: 'John',
                email: 'john@example.com',
            }))

            const users = userFactory.make()

            expect(users).toHaveLength(1)
            expect(users[0].name).toBe('John')
            expect(users[0].email).toBe('john@example.com')
        })

        it('should create multiple records with count()', () => {
            const userFactory = new Factory(() => ({
                name: 'John',
                email: 'john@example.com',
            }))

            const users = userFactory.count(5).make()

            expect(users).toHaveLength(5)
        })

        it('should apply state overrides', () => {
            const userFactory = new Factory(() => ({
                name: 'John',
                role: 'user',
            }))

            const admins = userFactory.state({ role: 'admin' }).make()

            expect(admins[0].role).toBe('admin')
            expect(admins[0].name).toBe('John') // Original preserved
        })

        it('should reset after make()', () => {
            const userFactory = new Factory(() => ({ name: 'John' }))

            userFactory.count(5).make()
            const users = userFactory.make()

            expect(users).toHaveLength(1) // Reset to default
        })
    })

    describe('makeOne', () => {
        it('should return a single record', () => {
            const userFactory = new Factory(() => ({ name: 'John' }))

            const user = userFactory.makeOne()

            expect(user.name).toBe('John')
        })
    })

    describe('factory helper', () => {
        it('should create a factory instance', () => {
            const userFactory = factory(() => ({ name: 'John' }))

            expect(userFactory).toBeInstanceOf(Factory)
            expect(userFactory.makeOne().name).toBe('John')
        })
    })
})

describe('SeederRunner', () => {
    describe('Constructor', () => {
        it('should create runner with default options', () => {
            const runner = new SeederRunner()
            expect(runner).toBeDefined()
        })

        it('should create runner with custom path', () => {
            const runner = new SeederRunner({ path: './db/seeders' })
            expect(runner).toBeDefined()
        })
    })

    describe('setPath', () => {
        it('should set seeders path', () => {
            const runner = new SeederRunner()
            const result = runner.setPath('./custom/path')
            expect(result).toBe(runner) // Fluent interface
        })
    })

    describe('connection', () => {
        it('should set database connection', () => {
            const runner = new SeederRunner()
            const result = runner.connection('mysql')
            expect(result).toBe(runner) // Fluent interface
        })
    })

    describe('list', () => {
        it('should return empty array for non-existent path', async () => {
            const runner = new SeederRunner({ path: './non-existent-path' })
            const seeders = await runner.list()
            expect(seeders).toEqual([])
        })
    })
})
