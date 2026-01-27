import { describe, expect, it } from 'vitest'
import { cn } from '../../../src/utils/cn'

describe('cn', () => {
  it('應該合併多個類名', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('應該處理條件類名', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('應該處理物件形式的類名', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })

  it('應該處理 Tailwind 衝突', () => {
    // twMerge 應該處理 Tailwind 類名衝突
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('應該處理空值', () => {
    expect(cn()).toBe('')
    expect(cn('')).toBe('')
    expect(cn(null, undefined, false)).toBe('')
  })

  it('應該處理陣列', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
    expect(cn(['foo', ['bar', 'baz']])).toBe('foo bar baz')
  })

  it('應該處理混合輸入', () => {
    expect(cn('foo', { bar: true, baz: false }, ['qux', 'quux'], false && 'nope', 'final')).toBe(
      'foo bar qux quux final'
    )
  })
})
