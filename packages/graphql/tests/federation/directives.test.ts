import { describe, expect, test } from 'bun:test'
import {
  externalDirective,
  getFederationDirectives,
  keyDirective,
  providesDirective,
  requiresDirective,
  shareableDirective,
} from '../../src/federation/directives'

describe('Federation 指令定義', () => {
  test('@key 指令存在', () => {
    expect(keyDirective).toBeDefined()
    expect(keyDirective.name).toBe('key')
    expect(keyDirective.args).toBeDefined()
    expect(keyDirective.isRepeatable).toBe(true)
  })

  test('@shareable 指令存在', () => {
    expect(shareableDirective).toBeDefined()
    expect(shareableDirective.name).toBe('shareable')
  })

  test('@external 指令存在', () => {
    expect(externalDirective).toBeDefined()
    expect(externalDirective.name).toBe('external')
  })

  test('@requires 指令存在', () => {
    expect(requiresDirective).toBeDefined()
    expect(requiresDirective.name).toBe('requires')
    expect(requiresDirective.args).toBeDefined()
  })

  test('@provides 指令存在', () => {
    expect(providesDirective).toBeDefined()
    expect(providesDirective.name).toBe('provides')
    expect(providesDirective.args).toBeDefined()
  })

  test('獲取所有 Federation 指令', () => {
    const directives = getFederationDirectives()

    expect(directives).toBeInstanceOf(Array)
    expect(directives).toHaveLength(5)
    expect(directives.map((d) => d.name)).toEqual([
      'key',
      'shareable',
      'external',
      'requires',
      'provides',
    ])
  })
})
