import { beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { HashFallback } from '../../src/ffi/hash-fallback'

// Known SHA-512 of 'hello'
const HELLO_SHA512 =
  '9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca7' +
  '2323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043'

describe('HashFallback — sha512 and blake2b', () => {
  let fallback: HashFallback

  beforeEach(() => {
    fallback = new HashFallback()
  })

  it('Test 1: sha512("hello") returns a 128-char hex string', () => {
    const result = fallback.sha512('hello')

    expect(typeof result).toBe('string')
    expect(result).toHaveLength(128)
    expect(/^[0-9a-f]+$/.test(result)).toBe(true)
  })

  it('Test 2: sha512("hello") returns the known SHA-512 hash', () => {
    const result = fallback.sha512('hello')

    expect(result).toBe(HELLO_SHA512)
  })

  it('Test 3: blake2b("hello") returns a 64-char hex string (SHA-256 fallback)', () => {
    const result = fallback.blake2b('hello')

    expect(typeof result).toBe('string')
    expect(result).toHaveLength(64)
    expect(/^[0-9a-f]+$/.test(result)).toBe(true)
  })

  it('Test 4: blake2b logs a warning about BLAKE2b fallback', () => {
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {})

    fallback.blake2b('hello')

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('BLAKE2b not available'),
    )

    warnSpy.mockRestore()
  })
})
