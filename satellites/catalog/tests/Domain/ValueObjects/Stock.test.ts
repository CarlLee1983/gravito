import { describe, expect, it } from 'bun:test'
import { Stock } from '../../../src/Domain/ValueObjects/Stock'

describe('Stock ValueObject', () => {
  it('should create stock instance with positive quantity', () => {
    const stock = Stock.of(100)
    expect(stock.quantity).toBe(100)
  })

  it('should create stock instance with zero quantity', () => {
    const stock = Stock.of(0)
    expect(stock.quantity).toBe(0)
    expect(stock.isAvailable).toBe(false)
  })

  it('should throw error for negative quantity', () => {
    expect(() => Stock.of(-5)).toThrow()
  })

  it('should throw error for non-integer quantity', () => {
    expect(() => Stock.of(10.5)).toThrow()
  })

  it('should check if stock is available', () => {
    const available = Stock.of(10)
    const unavailable = Stock.of(0)
    expect(available.isAvailable).toBe(true)
    expect(unavailable.isAvailable).toBe(false)
  })

  it('should check if stock is enough for requested quantity', () => {
    const stock = Stock.of(100)
    expect(stock.isEnoughFor(50)).toBe(true)
    expect(stock.isEnoughFor(100)).toBe(true)
    expect(stock.isEnoughFor(101)).toBe(false)
  })

  it('should deduct stock and return new instance', () => {
    const stock = Stock.of(100)
    const deducted = stock.deduct(30)
    expect(deducted.quantity).toBe(70)
    expect(stock.quantity).toBe(100) // Original unchanged (immutable)
  })

  it('should throw error when deducting more than available', () => {
    const stock = Stock.of(50)
    expect(() => stock.deduct(51)).toThrow()
  })

  it('should throw error when deducting zero or negative', () => {
    const stock = Stock.of(100)
    expect(() => stock.deduct(0)).toThrow()
    expect(() => stock.deduct(-10)).toThrow()
  })

  it('should add stock and return new instance', () => {
    const stock = Stock.of(100)
    const added = stock.add(50)
    expect(added.quantity).toBe(150)
    expect(stock.quantity).toBe(100) // Original unchanged (immutable)
  })

  it('should throw error when adding zero or negative', () => {
    const stock = Stock.of(100)
    expect(() => stock.add(0)).toThrow()
    expect(() => stock.add(-10)).toThrow()
  })

  it('should have value equality', () => {
    const stock1 = Stock.of(100)
    const stock2 = Stock.of(100)
    expect(stock1.equals(stock2)).toBe(true)
  })

  it('should chain deduct and add operations', () => {
    const stock = Stock.of(100)
    const deducted = stock.deduct(20)
    const added = deducted.add(30)
    expect(added.quantity).toBe(110)
  })
})
