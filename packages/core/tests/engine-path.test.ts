import { describe, expect, it } from 'bun:test'
import { extractPath, extractPathSimple } from '../src/engine/path'

describe('extractPath', () => {
  it('should extract path from full URL', () => {
    expect(extractPath('http://localhost:3000/api/users')).toBe('/api/users')
  })

  it('should extract path from URL with query string', () => {
    expect(extractPath('http://localhost:3000/api/users?id=1')).toBe('/api/users')
  })

  it('should return / for root URL', () => {
    expect(extractPath('http://localhost:3000/')).toBe('/')
  })

  it('should return / for URL without path', () => {
    expect(extractPath('http://localhost')).toBe('/')
  })

  it('should handle HTTPS URLs', () => {
    expect(extractPath('https://example.com/path')).toBe('/path')
  })

  it('should handle URLs with port', () => {
    expect(extractPath('http://localhost:8080/test')).toBe('/test')
  })

  it('should handle URLs with multiple path segments', () => {
    expect(extractPath('http://example.com/a/b/c/d')).toBe('/a/b/c/d')
  })

  it('should handle relative URL starting with /', () => {
    expect(extractPath('/api/test')).toBe('/api/test')
  })

  it('should handle relative URL with query', () => {
    expect(extractPath('/api/test?foo=bar')).toBe('/api/test')
  })
})

describe('extractPathSimple', () => {
  it('should extract path from full URL', () => {
    expect(extractPathSimple('http://localhost:3000/api/users')).toBe('/api/users')
  })

  it('should extract path from URL with query string', () => {
    expect(extractPathSimple('http://localhost:3000/api/users?id=1')).toBe('/api/users')
  })

  it('should return / for URL without path', () => {
    expect(extractPathSimple('http://localhost')).toBe('/')
  })

  it('should handle relative URLs without protocol', () => {
    expect(extractPathSimple('/api/test')).toBe('/api/test')
  })

  it('should handle relative URLs with query and no protocol', () => {
    expect(extractPathSimple('/api/test?foo=bar')).toBe('/api/test')
  })

  it('should handle relative URL without leading slash', () => {
    expect(extractPathSimple('api/test')).toBe('api/test')
  })

  it('should handle relative URL without leading slash and with query', () => {
    expect(extractPathSimple('api/test?q=1')).toBe('api/test')
  })

  it('should handle HTTPS URLs', () => {
    expect(extractPathSimple('https://example.com/path')).toBe('/path')
  })

  it('should handle URL with query string after protocol', () => {
    expect(extractPathSimple('http://example.com/path?key=val')).toBe('/path')
  })
})
