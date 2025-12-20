/**
 * Migration Runner Tests
 */

import { describe, expect, it } from 'bun:test'
import { MigrationRepository, Migrator } from '../src/migration'

describe('Migrator', () => {
  describe('Constructor', () => {
    it('should create migrator with default options', () => {
      const migrator = new Migrator()
      expect(migrator).toBeDefined()
    })

    it('should create migrator with custom path', () => {
      const migrator = new Migrator({ path: './db/migrations' })
      expect(migrator).toBeDefined()
    })

    it('should create migrator with custom table', () => {
      const migrator = new Migrator({ table: 'schema_migrations' })
      expect(migrator).toBeDefined()
    })
  })

  describe('setPath', () => {
    it('should set migrations path', () => {
      const migrator = new Migrator()
      const result = migrator.setPath('./custom/path')
      expect(result).toBe(migrator) // Fluent interface
    })
  })

  describe('connection', () => {
    it('should set database connection', () => {
      const migrator = new Migrator()
      const result = migrator.connection('mysql')
      expect(result).toBe(migrator) // Fluent interface
    })
  })
})

describe('MigrationRepository', () => {
  describe('Constructor', () => {
    it('should create repository with default connection', () => {
      const repo = new MigrationRepository()
      expect(repo).toBeDefined()
    })

    it('should create repository with custom connection', () => {
      const repo = new MigrationRepository('mysql')
      expect(repo).toBeDefined()
    })
  })

  describe('setTable', () => {
    it('should set table name', () => {
      const repo = new MigrationRepository()
      const result = repo.setTable('schema_migrations')
      expect(result).toBe(repo) // Fluent interface
    })
  })
})

// Note: Integration tests require actual database connection
// They should be run separately with proper database setup
