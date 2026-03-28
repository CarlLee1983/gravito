import { describe, expect, it } from 'bun:test'
import { DatabaseErrorCodes } from '../../../atlas/src/errors/codes'
import { CacheErrorCodes } from '../../../plasma/src/errors/codes'
import { MailErrorCodes } from '../../../signal/src/errors/codes'
import { QueueErrorCodes } from '../../../quasar/src/errors/codes'

describe('ErrorCodes Contract Tests (ERRM-02)', () => {
  describe('DatabaseErrorCodes', () => {
    it('exports a const object with dot-separated namespace strings', () => {
      expect(DatabaseErrorCodes).toBeDefined()
      expect(typeof DatabaseErrorCodes).toBe('object')
    })

    it('all values are dot-separated strings in db.* namespace', () => {
      for (const [, value] of Object.entries(DatabaseErrorCodes)) {
        expect(typeof value).toBe('string')
        expect(value).toMatch(/^db\.\w+/)
      }
    })

    it('contains expected error codes for known database errors', () => {
      expect(DatabaseErrorCodes.CONNECTION_FAILED).toBe('db.connection_failed')
      expect(DatabaseErrorCodes.UNIQUE_CONSTRAINT).toBe('db.unique_constraint')
      expect(DatabaseErrorCodes.TABLE_NOT_FOUND).toBe('db.table_not_found')
    })

    it('error codes are accessible at runtime without inspecting .message', () => {
      // ERRM-02: codes must be accessible as typed string constants
      const code = DatabaseErrorCodes.CONNECTION_FAILED
      expect(code).toBe('db.connection_failed')
      expect(typeof code).toBe('string')
    })
  })

  describe('CacheErrorCodes', () => {
    it('exports a const object with dot-separated namespace strings', () => {
      expect(CacheErrorCodes).toBeDefined()
      expect(typeof CacheErrorCodes).toBe('object')
    })

    it('all values are dot-separated strings in redis.* namespace', () => {
      for (const [, value] of Object.entries(CacheErrorCodes)) {
        expect(typeof value).toBe('string')
        expect(value).toMatch(/^redis\.\w+/)
      }
    })

    it('contains expected error codes', () => {
      expect(CacheErrorCodes.CONNECTION_FAILED).toBe('redis.connection_failed')
      expect(CacheErrorCodes.TIMEOUT).toBe('redis.timeout')
    })

    it('error codes are accessible at runtime without inspecting .message', () => {
      const code = CacheErrorCodes.COMMAND_FAILED
      expect(code).toBe('redis.command_failed')
      expect(typeof code).toBe('string')
    })
  })

  describe('MailErrorCodes', () => {
    it('exports a const object with dot-separated namespace strings', () => {
      expect(MailErrorCodes).toBeDefined()
      expect(typeof MailErrorCodes).toBe('object')
    })

    it('all values are dot-separated strings in mail.* namespace', () => {
      for (const [, value] of Object.entries(MailErrorCodes)) {
        expect(typeof value).toBe('string')
        expect(value).toMatch(/^mail\.\w+/)
      }
    })

    it('contains expected error codes', () => {
      expect(MailErrorCodes.CONNECTION_FAILED).toBe('mail.connection_failed')
      expect(MailErrorCodes.AUTH_FAILED).toBe('mail.auth_failed')
    })

    it('error codes are accessible at runtime without inspecting .message', () => {
      const code = MailErrorCodes.SEND_FAILED
      expect(code).toBe('mail.send_failed')
      expect(typeof code).toBe('string')
    })
  })

  describe('QueueErrorCodes', () => {
    it('exports a const object with dot-separated namespace strings', () => {
      expect(QueueErrorCodes).toBeDefined()
      expect(typeof QueueErrorCodes).toBe('object')
    })

    it('all values are dot-separated strings in queue.* namespace', () => {
      for (const [, value] of Object.entries(QueueErrorCodes)) {
        expect(typeof value).toBe('string')
        expect(value).toMatch(/^queue\.\w+/)
      }
    })

    it('contains expected error codes', () => {
      expect(QueueErrorCodes.CONNECTION_FAILED).toBe('queue.connection_failed')
      expect(QueueErrorCodes.COMMAND_EXECUTION_FAILED).toBe('queue.command_execution_failed')
    })

    it('error codes are accessible at runtime without inspecting .message', () => {
      const code = QueueErrorCodes.ENQUEUE_FAILED
      expect(code).toBe('queue.enqueue_failed')
      expect(typeof code).toBe('string')
    })
  })

  describe('Cross-package consistency', () => {
    it('no two packages share the same namespace prefix', () => {
      const prefixes = new Set<string>()
      const allCodes = [
        ...Object.values(DatabaseErrorCodes),
        ...Object.values(CacheErrorCodes),
        ...Object.values(MailErrorCodes),
        ...Object.values(QueueErrorCodes),
      ]
      for (const code of allCodes) {
        const prefix = code.split('.')[0]
        prefixes.add(prefix)
      }
      // Each package should have a unique prefix
      expect(prefixes.size).toBe(4) // db, redis, mail, queue
    })

    it('all error codes across packages are unique strings', () => {
      const allCodes = [
        ...Object.values(DatabaseErrorCodes),
        ...Object.values(CacheErrorCodes),
        ...Object.values(MailErrorCodes),
        ...Object.values(QueueErrorCodes),
      ]
      const uniqueCodes = new Set(allCodes)
      expect(uniqueCodes.size).toBe(allCodes.length)
    })
  })
})
