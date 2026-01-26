/**
 * ColumnNotFoundError Tests
 * Tests the ColumnNotFoundError error class with "Did you mean?" suggestions
 */

import { describe, expect, test } from 'bun:test'
import { ColumnNotFoundError } from '../src/orm/model/errors'

describe('ColumnNotFoundError', () => {
  test('should create error with basic message', () => {
    const error = new ColumnNotFoundError('users', 'invalid_column')

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(ColumnNotFoundError)
    expect(error.name).toBe('ColumnNotFoundError')
    expect(error.table).toBe('users')
    expect(error.column).toBe('invalid_column')
    expect(error.message).toContain('Column "invalid_column" does not exist on table "users"')
  })

  test('should include "Did you mean?" suggestions when similar columns exist', () => {
    const availableColumns = ['name', 'email', 'username', 'created_at', 'updated_at']
    const error = new ColumnNotFoundError('users', 'usernam', availableColumns)

    expect(error.message).toContain('Did you mean')
    expect(error.message).toContain('"username"')
    // Should not suggest columns that are too different
    expect(error.message).not.toContain('"email"')
  })

  test('should include multiple suggestions when multiple similar columns exist', () => {
    const availableColumns = ['created_at', 'updated_at', 'deleted_at']
    const error = new ColumnNotFoundError('users', 'creatd_at', availableColumns) // Typo: missing 'e'

    expect(error.message).toContain('Did you mean')
    // Should suggest "created_at" as it's similar (distance = 1)
    expect(error.message).toContain('"created_at"')
  })

  test('should list all available columns', () => {
    const availableColumns = ['id', 'name', 'email', 'age']
    const error = new ColumnNotFoundError('users', 'invalid', availableColumns)

    expect(error.message).toContain('Available columns')
    expect(error.message).toContain('id')
    expect(error.message).toContain('name')
    expect(error.message).toContain('email')
    expect(error.message).toContain('age')
  })

  test('should handle empty available columns list', () => {
    const error = new ColumnNotFoundError('users', 'invalid_column', [])

    expect(error.message).not.toContain('Did you mean')
    expect(error.message).not.toContain('Available columns')
  })

  test('should handle case-insensitive similarity matching', () => {
    const availableColumns = ['UserName', 'Email', 'FullName']
    const error = new ColumnNotFoundError('users', 'username', availableColumns)

    // Should suggest "UserName" even though case differs
    expect(error.message).toContain('Did you mean')
  })

  test('should limit suggestions to max 3 similar columns', () => {
    // Create many similar column names
    const availableColumns = ['name1', 'name2', 'name3', 'name4', 'name5', 'email', 'age']
    const error = new ColumnNotFoundError('users', 'name', availableColumns)

    const didYouMeanMatch = error.message.match(/Did you mean: (.*)\?/)
    if (didYouMeanMatch) {
      const suggestions = didYouMeanMatch[1].split(', ')
      // Should limit to max 3 suggestions
      expect(suggestions.length).toBeLessThanOrEqual(3)
    }
  })

  test('should work with special characters in column names', () => {
    const availableColumns = ['user_name', 'user-email', 'user.id']
    const error = new ColumnNotFoundError('users', 'user_name', availableColumns)

    expect(error.message).toContain('Available columns')
    expect(error.message).toContain('user_name')
  })
})
