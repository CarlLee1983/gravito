import { describe, expect, it } from 'bun:test'
import { Slug } from '../../../src/Domain/ValueObjects/Slug'

describe('Slug ValueObject', () => {
  it('should create slug with valid format', () => {
    const slug = Slug.of('my-product-name')
    expect(slug.value).toBe('my-product-name')
  })

  it('should create slug with lowercase letters and numbers', () => {
    const slug = Slug.of('product123')
    expect(slug.value).toBe('product123')
  })

  it('should create slug with hyphens', () => {
    const slug = Slug.of('my-awesome-product')
    expect(slug.value).toBe('my-awesome-product')
  })

  it('should throw error for slug with uppercase letters', () => {
    expect(() => Slug.of('MyProduct')).toThrow()
  })

  it('should throw error for slug with spaces', () => {
    expect(() => Slug.of('my product')).toThrow()
  })

  it('should throw error for slug with special characters', () => {
    expect(() => Slug.of('my@product')).toThrow()
    expect(() => Slug.of('my_product')).toThrow()
    expect(() => Slug.of('my.product')).toThrow()
  })

  it('should throw error for slug starting with hyphen', () => {
    expect(() => Slug.of('-my-product')).toThrow()
  })

  it('should throw error for slug ending with hyphen', () => {
    expect(() => Slug.of('my-product-')).toThrow()
  })

  it('should throw error for empty slug', () => {
    expect(() => Slug.of('')).toThrow()
  })

  it('should throw error for slug with consecutive hyphens', () => {
    expect(() => Slug.of('my--product')).toThrow()
  })

  it('should have value equality', () => {
    const slug1 = Slug.of('my-product')
    const slug2 = Slug.of('my-product')
    expect(slug1.equals(slug2)).toBe(true)
  })

  it('should accept single word slug', () => {
    const slug = Slug.of('product')
    expect(slug.value).toBe('product')
  })

  it('should accept numeric slug', () => {
    const slug = Slug.of('123')
    expect(slug.value).toBe('123')
  })
})
