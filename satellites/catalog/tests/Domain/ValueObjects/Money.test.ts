import { describe, expect, it } from 'bun:test'
import { CatalogErrorFactory } from '../../../src/Application/Errors/CatalogError'
import { Money } from '../../../src/Domain/ValueObjects/Money'

describe('Money ValueObject', () => {
  it('should create money instance with positive amount', () => {
    const money = Money.of(99.99)
    expect(money.value).toBe(99.99)
    expect(money.amountInCents).toBe(9999)
    expect(money.currency).toBe('TWD')
  })

  it('should create money instance with custom currency', () => {
    const money = Money.of(50, 'USD')
    expect(money.currency).toBe('USD')
  })

  it('should throw error for negative amount', () => {
    expect(() => Money.of(-10)).toThrow()
  })

  it('should handle floating point precision correctly', () => {
    const money = Money.of(0.01)
    expect(money.amountInCents).toBe(1)
  })

  it('should add two money instances', () => {
    const money1 = Money.of(50)
    const money2 = Money.of(30)
    const sum = money1.add(money2)
    expect(sum.value).toBe(80)
  })

  it('should throw error when adding different currencies', () => {
    const twd = Money.of(100, 'TWD')
    const usd = Money.of(100, 'USD')
    expect(() => twd.add(usd)).toThrow()
  })

  it('should multiply money', () => {
    const money = Money.of(10)
    const multiplied = money.multiply(3)
    expect(multiplied.value).toBe(30)
  })

  it('should throw error for negative multiply factor', () => {
    const money = Money.of(10)
    expect(() => money.multiply(-5)).toThrow()
  })

  it('should compare money amounts', () => {
    const money1 = Money.of(100)
    const money2 = Money.of(50)
    expect(money1.isGreaterThan(money2)).toBe(true)
    expect(money2.isGreaterThan(money1)).toBe(false)
  })

  it('should have value equality', () => {
    const money1 = Money.of(99.99)
    const money2 = Money.of(99.99)
    expect(money1.equals(money2)).toBe(true)
  })

  it('should round amounts to cents correctly', () => {
    const money = Money.of(99.999) // Should round to 100.00
    expect(money.amountInCents).toBe(10000)
  })
})
