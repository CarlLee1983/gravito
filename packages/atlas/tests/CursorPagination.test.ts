/**
 * Tests: Cursor Pagination
 * @description Unit tests for CursorEncoding utilities and the cursorPaginate() QueryBuilder method.
 */

import { describe, expect, it } from 'bun:test'
import {
  buildCursorWhereClause,
  type CursorPayload,
  decodeCursor,
  encodeCursor,
} from '../src/utils/CursorEncoding'

// ============================================================================
// CursorEncoding Tests
// ============================================================================

describe('CursorEncoding', () => {
  describe('encodeCursor / decodeCursor round-trip', () => {
    it('encodes and decodes a simple id cursor', () => {
      const payload: CursorPayload = {
        id: 42,
        sortValue: 42,
        sortColumn: 'id',
        direction: 'asc',
      }

      const encoded = encodeCursor(payload)
      expect(typeof encoded).toBe('string')
      expect(encoded.length).toBeGreaterThan(0)

      const decoded = decodeCursor(encoded)
      expect(decoded.id).toBe(42)
      expect(decoded.sortColumn).toBe('id')
      expect(decoded.direction).toBe('asc')
    })

    it('encodes and decodes a composite cursor (sortColumn + id)', () => {
      const payload: CursorPayload = {
        id: 99,
        sortValue: '2026-01-15T10:00:00Z',
        sortColumn: 'created_at',
        direction: 'asc',
      }

      const cursor = encodeCursor(payload)
      const decoded = decodeCursor(cursor)

      expect(decoded.id).toBe(99)
      expect(decoded.sortValue).toBe('2026-01-15T10:00:00Z')
      expect(decoded.sortColumn).toBe('created_at')
    })

    it('encodes and decodes null-like values', () => {
      const payload: CursorPayload = {
        id: 'uuid-1234',
        sortValue: 0,
        sortColumn: 'score',
        direction: 'desc',
      }

      const cursor = encodeCursor(payload)
      const decoded = decodeCursor(cursor)

      expect(decoded.id).toBe('uuid-1234')
      expect(decoded.sortValue).toBe(0)
      expect(decoded.sortColumn).toBe('score')
      expect(decoded.direction).toBe('desc')
    })

    it('produces URL-safe base64 (no +/= characters)', () => {
      const cursor = encodeCursor({ id: 1234, sortValue: 1234, sortColumn: 'id', direction: 'asc' })
      // base64url has no +, /, or = characters
      expect(cursor).not.toMatch(/[+/=]/)
    })
  })

  describe('decodeCursor error handling', () => {
    it('throws for a completely invalid cursor', () => {
      expect(() => decodeCursor('not-valid-base64!!')).toThrow()
    })

    it('throws for a valid base64 but invalid JSON cursor', () => {
      const badCursor = Buffer.from('this is not json').toString('base64url')
      expect(() => decodeCursor(badCursor)).toThrow()
    })

    it('throws for a cursor missing required fields', () => {
      const incomplete = Buffer.from(JSON.stringify({ foo: 'bar' })).toString('base64url')
      expect(() => decodeCursor(incomplete)).toThrow(/Invalid cursor/)
    })
  })

  describe('buildCursorWhereClause', () => {
    it('generates simple single-column clause for id-only cursor', () => {
      const payload: CursorPayload = { id: 10, sortValue: 10, sortColumn: 'id', direction: 'asc' }
      const { sql, bindings } = buildCursorWhereClause(payload, 'id')

      expect(sql).toBe('id > ?')
      expect(bindings).toEqual([10])
    })

    it('generates simple descending clause', () => {
      const payload: CursorPayload = { id: 10, sortValue: 10, sortColumn: 'id', direction: 'desc' }
      const { sql, bindings } = buildCursorWhereClause(payload, 'id')

      expect(sql).toBe('id < ?')
      expect(bindings).toEqual([10])
    })

    it('generates tuple comparison for composite cursor (ascending)', () => {
      const payload: CursorPayload = {
        id: 99,
        sortValue: '2026-01-15',
        sortColumn: 'created_at',
        direction: 'asc',
      }
      const { sql, bindings } = buildCursorWhereClause(payload, 'id')

      expect(sql).toBe('(created_at, id) > (?, ?)')
      expect(bindings).toEqual(['2026-01-15', 99])
    })

    it('generates tuple comparison for composite cursor (descending)', () => {
      const payload: CursorPayload = {
        id: 99,
        sortValue: '2026-01-15',
        sortColumn: 'created_at',
        direction: 'desc',
      }
      const { sql, bindings } = buildCursorWhereClause(payload, 'id')

      expect(sql).toBe('(created_at, id) < (?, ?)')
      expect(bindings).toEqual(['2026-01-15', 99])
    })
  })
})
