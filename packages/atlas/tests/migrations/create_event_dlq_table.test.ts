/**
 * Event DLQ Table Migration Tests
 *
 * 測試 event_dlq 資料表遷移的正確性
 * 驗證所有欄位、索引和約束都符合規範
 */

import { beforeEach, describe, expect, it } from 'bun:test'
// 導入遷移類別
import CreateEventDlqTable from '../../migrations/create_event_dlq_table'
import { type Blueprint, MySQLSchemaGrammar, PostgresSchemaGrammar } from '../../src/schema'

describe('CreateEventDlqTable Migration', () => {
  describe('Migration Interface', () => {
    it('should implement Migration interface', () => {
      const migration = new CreateEventDlqTable()

      expect(migration).toBeDefined()
      expect(typeof migration.up).toBe('function')
      expect(typeof migration.down).toBe('function')
    })

    it('should be a valid Migration constructor', () => {
      const MigrationClass = CreateEventDlqTable
      expect(MigrationClass).toBeDefined()
      expect(new MigrationClass()).toBeInstanceOf(CreateEventDlqTable)
    })
  })

  describe('Table Schema (via getBlueprint)', () => {
    let migration: CreateEventDlqTable
    let blueprint: Blueprint

    beforeEach(() => {
      migration = new CreateEventDlqTable()
      blueprint = migration.getBlueprint()
    })

    describe('Required Columns', () => {
      it('should have id column as auto-increment primary key', () => {
        const columns = blueprint.getColumns()
        const idColumn = columns.find((c) => c.name === 'id')

        expect(idColumn).toBeDefined()
        expect(idColumn?.type).toBe('bigInteger')
        expect(idColumn?.isAutoIncrement()).toBe(true)
        expect(idColumn?.isPrimary()).toBe(true)
      })

      it('should have dlq_id column as unique UUID', () => {
        const columns = blueprint.getColumns()
        const dlqIdColumn = columns.find((c) => c.name === 'dlq_id')

        expect(dlqIdColumn).toBeDefined()
        expect(dlqIdColumn?.type).toBe('uuid')
        expect(dlqIdColumn?.isUnique()).toBe(true)
      })

      it('should have event_name column as string', () => {
        const columns = blueprint.getColumns()
        const eventNameColumn = columns.find((c) => c.name === 'event_name')

        expect(eventNameColumn).toBeDefined()
        expect(eventNameColumn?.type).toBe('string')
        expect(eventNameColumn?.isNullable()).toBe(false)
      })

      it('should have event_payload column as JSON', () => {
        const columns = blueprint.getColumns()
        const payloadColumn = columns.find((c) => c.name === 'event_payload')

        expect(payloadColumn).toBeDefined()
        // jsonb 或 json 都可以接受
        expect(['json', 'jsonb']).toContain(payloadColumn?.type)
      })

      it('should have event_options column as JSON', () => {
        const columns = blueprint.getColumns()
        const optionsColumn = columns.find((c) => c.name === 'event_options')

        expect(optionsColumn).toBeDefined()
        expect(['json', 'jsonb']).toContain(optionsColumn?.type)
      })

      it('should have attempt_count column as integer with default 0', () => {
        const columns = blueprint.getColumns()
        const attemptColumn = columns.find((c) => c.name === 'attempt_count')

        expect(attemptColumn).toBeDefined()
        expect(attemptColumn?.type).toBe('integer')
        expect(attemptColumn?.hasDefaultValue()).toBe(true)
        expect(attemptColumn?.getDefault()).toBe(0)
      })

      it('should have max_retries column as integer with default 3', () => {
        const columns = blueprint.getColumns()
        const maxRetriesColumn = columns.find((c) => c.name === 'max_retries')

        expect(maxRetriesColumn).toBeDefined()
        expect(maxRetriesColumn?.type).toBe('integer')
        expect(maxRetriesColumn?.hasDefaultValue()).toBe(true)
        expect(maxRetriesColumn?.getDefault()).toBe(3)
      })

      it('should have next_retry_at column as nullable timestamp', () => {
        const columns = blueprint.getColumns()
        const nextRetryColumn = columns.find((c) => c.name === 'next_retry_at')

        expect(nextRetryColumn).toBeDefined()
        expect(['timestamp', 'timestampTz']).toContain(nextRetryColumn?.type)
        expect(nextRetryColumn?.isNullable()).toBe(true)
      })

      it('should have last_error column as nullable JSON', () => {
        const columns = blueprint.getColumns()
        const errorColumn = columns.find((c) => c.name === 'last_error')

        expect(errorColumn).toBeDefined()
        expect(['json', 'jsonb']).toContain(errorColumn?.type)
        expect(errorColumn?.isNullable()).toBe(true)
      })

      it('should have status column as enum with correct values', () => {
        const columns = blueprint.getColumns()
        const statusColumn = columns.find((c) => c.name === 'status')

        expect(statusColumn).toBeDefined()
        expect(statusColumn?.type).toBe('enum')

        const values = statusColumn?.parameters.values as string[]
        expect(values).toContain('pending')
        expect(values).toContain('requeued')
        expect(values).toContain('resolved')
        expect(values).toContain('abandoned')
      })

      it('should have status column with default value pending', () => {
        const columns = blueprint.getColumns()
        const statusColumn = columns.find((c) => c.name === 'status')

        expect(statusColumn?.hasDefaultValue()).toBe(true)
        expect(statusColumn?.getDefault()).toBe('pending')
      })

      it('should have resolution_notes column as nullable text', () => {
        const columns = blueprint.getColumns()
        const notesColumn = columns.find((c) => c.name === 'resolution_notes')

        expect(notesColumn).toBeDefined()
        expect(notesColumn?.type).toBe('text')
        expect(notesColumn?.isNullable()).toBe(true)
      })

      it('should have failed_at column as timestamp', () => {
        const columns = blueprint.getColumns()
        const failedAtColumn = columns.find((c) => c.name === 'failed_at')

        expect(failedAtColumn).toBeDefined()
        expect(['timestamp', 'timestampTz']).toContain(failedAtColumn?.type)
        expect(failedAtColumn?.isNullable()).toBe(false)
      })

      it('should have created_at and updated_at columns', () => {
        const columns = blueprint.getColumns()
        const createdAt = columns.find((c) => c.name === 'created_at')
        const updatedAt = columns.find((c) => c.name === 'updated_at')

        expect(createdAt).toBeDefined()
        expect(updatedAt).toBeDefined()
        expect(['timestamp', 'timestampTz']).toContain(createdAt?.type)
        expect(['timestamp', 'timestampTz']).toContain(updatedAt?.type)
      })

      it('should have exactly 14 columns', () => {
        const columns = blueprint.getColumns()
        expect(columns).toHaveLength(14)
      })
    })

    describe('Indexes', () => {
      it('should have index on event_name', () => {
        const indexes = blueprint.getIndexes()
        const eventNameIndex = indexes.find(
          (idx) => idx.columns.includes('event_name') && idx.columns.length === 1
        )

        expect(eventNameIndex).toBeDefined()
        expect(eventNameIndex?.type).toBe('index')
      })

      it('should have index on status', () => {
        const indexes = blueprint.getIndexes()
        const statusIndex = indexes.find(
          (idx) => idx.columns.includes('status') && idx.columns.length === 1
        )

        expect(statusIndex).toBeDefined()
        expect(statusIndex?.type).toBe('index')
      })

      it('should have index on failed_at', () => {
        const indexes = blueprint.getIndexes()
        const failedAtIndex = indexes.find(
          (idx) => idx.columns.includes('failed_at') && idx.columns.length === 1
        )

        expect(failedAtIndex).toBeDefined()
        expect(failedAtIndex?.type).toBe('index')
      })

      it('should have composite index on (event_name, status)', () => {
        const indexes = blueprint.getIndexes()
        const compositeIndex = indexes.find(
          (idx) =>
            idx.columns.includes('event_name') &&
            idx.columns.includes('status') &&
            idx.columns.length === 2
        )

        expect(compositeIndex).toBeDefined()
        expect(compositeIndex?.type).toBe('index')
      })

      it('should have at least 4 indexes (excluding primary and unique)', () => {
        const indexes = blueprint.getIndexes()
        // 過濾出非 primary 和非 unique 的索引
        const normalIndexes = indexes.filter((idx) => idx.type === 'index')
        expect(normalIndexes.length).toBeGreaterThanOrEqual(4)
      })
    })
  })

  describe('SQL Generation', () => {
    let migration: CreateEventDlqTable
    let blueprint: Blueprint

    beforeEach(() => {
      migration = new CreateEventDlqTable()
      blueprint = migration.getBlueprint()
    })

    describe('PostgreSQL', () => {
      const grammar = new PostgresSchemaGrammar()

      it('should generate valid CREATE TABLE SQL', () => {
        const sql = grammar.compileCreate(blueprint)

        expect(sql).toContain('CREATE TABLE "event_dlq"')
        expect(sql).toContain('"id" BIGSERIAL')
        expect(sql).toContain('"dlq_id" UUID')
        expect(sql).toContain('"event_name" VARCHAR')
        expect(sql).toContain('"status"')
        expect(sql).toContain('"failed_at" TIMESTAMP')
      })

      it('should generate DROP TABLE IF EXISTS SQL', () => {
        const sql = grammar.compileDropIfExists('event_dlq')
        expect(sql).toBe('DROP TABLE IF EXISTS "event_dlq"')
      })
    })

    describe('MySQL', () => {
      const grammar = new MySQLSchemaGrammar()

      it('should generate valid CREATE TABLE SQL', () => {
        const sql = grammar.compileCreate(blueprint)

        expect(sql).toContain('CREATE TABLE `event_dlq`')
        expect(sql).toContain('`id` BIGINT UNSIGNED AUTO_INCREMENT')
        expect(sql).toContain('`dlq_id`')
        expect(sql).toContain('`event_name`')
        expect(sql).toContain("ENUM('pending', 'requeued', 'resolved', 'abandoned')")
      })

      it('should generate DROP TABLE IF EXISTS SQL', () => {
        const sql = grammar.compileDropIfExists('event_dlq')
        expect(sql).toBe('DROP TABLE IF EXISTS `event_dlq`')
      })
    })
  })

  describe('Table Name', () => {
    it('should use correct table name: event_dlq', () => {
      const migration = new CreateEventDlqTable()
      const blueprint = migration.getBlueprint()

      expect(blueprint.table).toBe('event_dlq')
    })
  })

  describe('Compatibility with DeadLetterQueueManager', () => {
    it('should have all columns required by DLQRecord interface', () => {
      const migration = new CreateEventDlqTable()
      const blueprint = migration.getBlueprint()
      const columns = blueprint.getColumns()
      const columnNames = columns.map((c) => c.name)

      // 根據 DeadLetterQueueManager.ts 中的 DLQRecord 介面
      const requiredColumns = [
        'id',
        'dlq_id',
        'event_name',
        'event_payload',
        'event_options',
        'attempt_count',
        'max_retries',
        'next_retry_at',
        'last_error',
        'status',
        'resolution_notes',
        'failed_at',
        'created_at',
        'updated_at',
      ]

      for (const col of requiredColumns) {
        expect(columnNames).toContain(col)
      }
    })
  })
})
