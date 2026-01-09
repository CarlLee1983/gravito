import { describe, expect, test } from 'bun:test'
import { cn } from '../src/utils'

describe('cn', () => {
  test('merges class names and resolves tailwind conflicts', () => {
    const result = cn('p-2', 'text-sm', 'p-4')
    expect(result).toBe('text-sm p-4')
  })

  test('handles falsy values', () => {
    const result = cn('bg-black', null, undefined, false, 'text-white')
    expect(result).toBe('bg-black text-white')
  })
})
