import { describe, expect, it } from 'bun:test'
import { TemplateCompiler } from '../src/core/TemplateCompiler'

describe('Comparison helper functions', () => {
  const compiler = new TemplateCompiler()

  const compile = (template: string, data: Record<string, unknown> = {}) => {
    const ctx = { sections: new Map(), stacks: new Map() }
    return compiler.compile(template, data, ctx, new Map(), (name) => {
      throw new Error(`Template not found: ${name}`)
    })
  }

  describe('eq (equals)', () => {
    it('should support string equality check', () => {
      const template = "{{#if eq(status, 'active')}}ACTIVE{{/if}}"
      const result = compile(template, { status: 'active' })
      expect(result).toContain('ACTIVE')

      const result2 = compile(template, { status: 'inactive' })
      expect(result2).not.toContain('ACTIVE')
    })

    it('should support numeric equality check', () => {
      const template = '{{#if eq(count, 5)}}FIVE{{/if}}'
      const result = compile(template, { count: 5 })
      expect(result).toContain('FIVE')

      const result2 = compile(template, { count: 3 })
      expect(result2).not.toContain('FIVE')
    })

    it('should support variable comparison', () => {
      const template = '{{#if eq(actual, expected)}}MATCH{{/if}}'
      const result = compile(template, { actual: 'test', expected: 'test' })
      expect(result).toContain('MATCH')

      const result2 = compile(template, { actual: 'test', expected: 'other' })
      expect(result2).not.toContain('MATCH')
    })
  })

  describe('ne (not equals)', () => {
    it('should support string inequality check', () => {
      const template = "{{#if ne(role, 'admin')}}NOT_ADMIN{{/if}}"
      const result = compile(template, { role: 'user' })
      expect(result).toContain('NOT_ADMIN')

      const result2 = compile(template, { role: 'admin' })
      expect(result2).not.toContain('NOT_ADMIN')
    })

    it('should support numeric inequality check', () => {
      const template = '{{#if ne(age, 18)}}NOT_18{{/if}}'
      const result = compile(template, { age: 25 })
      expect(result).toContain('NOT_18')

      const result2 = compile(template, { age: 18 })
      expect(result2).not.toContain('NOT_18')
    })
  })

  describe('gt (greater than)', () => {
    it('should support numeric greater than check', () => {
      const template = '{{#if gt(price, 100)}}EXPENSIVE{{/if}}'
      const result = compile(template, { price: 150 })
      expect(result).toContain('EXPENSIVE')

      const result2 = compile(template, { price: 50 })
      expect(result2).not.toContain('EXPENSIVE')

      const result3 = compile(template, { price: 100 })
      expect(result3).not.toContain('EXPENSIVE')
    })

    it('should support variable comparison', () => {
      const template = '{{#if gt(actual, threshold)}}OVER{{/if}}'
      const result = compile(template, { actual: 50, threshold: 40 })
      expect(result).toContain('OVER')

      const result2 = compile(template, { actual: 30, threshold: 40 })
      expect(result2).not.toContain('OVER')
    })
  })

  describe('lt (less than)', () => {
    it('should support numeric less than check', () => {
      const template = '{{#if lt(stock, 10)}}LOW_STOCK{{/if}}'
      const result = compile(template, { stock: 5 })
      expect(result).toContain('LOW_STOCK')

      const result2 = compile(template, { stock: 20 })
      expect(result2).not.toContain('LOW_STOCK')

      const result3 = compile(template, { stock: 10 })
      expect(result3).not.toContain('LOW_STOCK')
    })
  })

  describe('gte (greater than or equal)', () => {
    it('should support numeric greater than or equal check', () => {
      const template = '{{#if gte(rating, 4)}}GOOD{{/if}}'
      const result = compile(template, { rating: 5 })
      expect(result).toContain('GOOD')

      const result2 = compile(template, { rating: 4 })
      expect(result2).toContain('GOOD')

      const result3 = compile(template, { rating: 3 })
      expect(result3).not.toContain('GOOD')
    })
  })

  describe('lte (less than or equal)', () => {
    it('should support numeric less than or equal check', () => {
      const template = '{{#if lte(temperature, 25)}}COOL{{/if}}'
      const result = compile(template, { temperature: 20 })
      expect(result).toContain('COOL')

      const result2 = compile(template, { temperature: 25 })
      expect(result2).toContain('COOL')

      const result3 = compile(template, { temperature: 30 })
      expect(result3).not.toContain('COOL')
    })
  })

  describe('Complex scenarios', () => {
    it('should support nested object property comparison', () => {
      const template = "{{#if eq(user.role, 'admin')}}ADMIN_VIEW{{/if}}"
      const result = compile(template, {
        user: { role: 'admin', name: 'John' },
      })
      expect(result).toContain('ADMIN_VIEW')

      const result2 = compile(template, {
        user: { role: 'user', name: 'Jane' },
      })
      expect(result2).not.toContain('ADMIN_VIEW')
    })

    it('should support multiple comparison helpers in template', () => {
      const template = [
        "{{#if eq(status, 'available')}}AVAILABLE{{/if}}",
        '{{#if gt(price, 50)}}EXPENSIVE{{/if}}',
        '{{#if lt(stock, 5)}}LOW{{/if}}',
      ].join('\n')

      const result = compile(template, {
        status: 'available',
        price: 100,
        stock: 2,
      })
      expect(result).toContain('AVAILABLE')
      expect(result).toContain('EXPENSIVE')
      expect(result).toContain('LOW')
    })

    it('should support with-else blocks', () => {
      const template = "{{#if eq(status, 'active')}}ACTIVE{{else}}DISABLED{{/if}}"
      const result = compile(template, { status: 'active' })
      expect(result).toContain('ACTIVE')
      expect(result).not.toContain('DISABLED')

      const result2 = compile(template, { status: 'disabled' })
      expect(result2).not.toContain('ACTIVE')
      expect(result2).toContain('DISABLED')
    })

    it('should support @unless with comparison helpers', () => {
      const template = "{{#unless eq(role, 'guest')}}LOGGED_IN{{/unless}}"
      const result = compile(template, { role: 'user' })
      expect(result).toContain('LOGGED_IN')

      const result2 = compile(template, { role: 'guest' })
      expect(result2).not.toContain('LOGGED_IN')
    })

    it('should support decimal number comparison', () => {
      const template = '{{#if gte(discount, 0.15)}}HIGH_DISCOUNT{{/if}}'
      const result = compile(template, { discount: 0.2 })
      expect(result).toContain('HIGH_DISCOUNT')

      const result2 = compile(template, { discount: 0.1 })
      expect(result2).not.toContain('HIGH_DISCOUNT')
    })

    it('should handle missing variable gracefully', () => {
      const template = '{{#if eq(undefinedVar, "test")}}MATCH{{/if}}'
      const result = compile(template, {})
      expect(result).not.toContain('MATCH')
    })

    it('should handle whitespace in helper expressions', () => {
      const template = '{{#if eq(  status  ,  "active"  )}}OK{{/if}}'
      const result = compile(template, { status: 'active' })
      expect(result).toContain('OK')
    })
  })

  describe('Boolean literal comparison', () => {
    it('should support true comparison', () => {
      const template = '{{#if eq(enabled, true)}}ENABLED{{/if}}'
      const result = compile(template, { enabled: true })
      expect(result).toContain('ENABLED')

      const result2 = compile(template, { enabled: false })
      expect(result2).not.toContain('ENABLED')
    })

    it('should support false comparison', () => {
      const template = '{{#if eq(disabled, false)}}NOT_DISABLED{{/if}}'
      const result = compile(template, { disabled: false })
      expect(result).toContain('NOT_DISABLED')

      const result2 = compile(template, { disabled: true })
      expect(result2).not.toContain('NOT_DISABLED')
    })
  })
})
