import { beforeEach, describe, expect, it } from 'bun:test'
import {
  NativeOrbitDetector,
  formatCapabilityReport,
} from '../../src/runtime/NativeOrbitDetector'

describe('NativeOrbitDetector', () => {
  beforeEach(() => {
    NativeOrbitDetector.reset()
  })

  it('Test 1: detectBunCapabilities() returns NativeFeatures with expected shape', () => {
    const features = NativeOrbitDetector.detectBunCapabilities()

    expect(features).toHaveProperty('runtime')
    expect(features).toHaveProperty('bunVersion')
    expect(features).toHaveProperty('password')
    expect(features.password).toHaveProperty('available')
    expect(features.password).toHaveProperty('argon2id')
    expect(features.password).toHaveProperty('bcrypt')
    expect(features).toHaveProperty('cryptoHasher')
    expect(features.cryptoHasher).toHaveProperty('available')
    expect(features.cryptoHasher).toHaveProperty('sha256')
    expect(features.cryptoHasher).toHaveProperty('sha512')
    expect(features.cryptoHasher).toHaveProperty('blake2b')
    expect(features).toHaveProperty('glob')
  })

  it('Test 2: On Bun runtime, password fields are true', () => {
    const features = NativeOrbitDetector.detectBunCapabilities()

    // We are running in Bun, so password should be available
    expect(features.runtime).toBe('bun')
    expect(features.password.available).toBe(true)
    expect(features.password.argon2id).toBe(true)
    expect(features.password.bcrypt).toBe(true)
  })

  it('Test 3: On Bun runtime, cryptoHasher fields are true', () => {
    const features = NativeOrbitDetector.detectBunCapabilities()

    expect(features.runtime).toBe('bun')
    expect(features.cryptoHasher.sha256).toBe(true)
    expect(features.cryptoHasher.sha512).toBe(true)
    expect(features.cryptoHasher.blake2b).toBe(true)
  })

  it('Test 4: On Bun runtime, glob is true', () => {
    const features = NativeOrbitDetector.detectBunCapabilities()

    expect(features.runtime).toBe('bun')
    expect(features.glob).toBe(true)
  })

  it('Test 5: Returned object is frozen', () => {
    const features = NativeOrbitDetector.detectBunCapabilities()

    expect(Object.isFrozen(features)).toBe(true)
  })

  it('Test 6: Second call returns cached result (same reference)', () => {
    const first = NativeOrbitDetector.detectBunCapabilities()
    const second = NativeOrbitDetector.detectBunCapabilities()

    expect(first).toBe(second)
  })

  it('Test 7: reset() clears cache — next call returns fresh object', () => {
    const first = NativeOrbitDetector.detectBunCapabilities()
    NativeOrbitDetector.reset()
    const second = NativeOrbitDetector.detectBunCapabilities()

    expect(first).not.toBe(second)
  })

  it('Test 8: formatCapabilityReport returns string with [gravito] native: prefix', () => {
    const features = NativeOrbitDetector.detectBunCapabilities()
    const report = formatCapabilityReport(features)

    expect(typeof report).toBe('string')
    expect(report).toContain('[gravito] native:')
  })

  it('Test 9: formatCapabilityReport shows checkmarks for available APIs', () => {
    const features = NativeOrbitDetector.detectBunCapabilities()
    const report = formatCapabilityReport(features)

    // On Bun, all should show checkmarks
    if (features.password.argon2id) {
      expect(report).toContain('argon2id ✓')
    } else {
      expect(report).toContain('argon2id ✗')
    }

    if (features.cryptoHasher.available) {
      expect(report).toContain('Bun.CryptoHasher ✓')
    } else {
      expect(report).toContain('Bun.CryptoHasher ✗')
    }

    if (features.glob) {
      expect(report).toContain('Bun.Glob ✓')
    } else {
      expect(report).toContain('Bun.Glob ✗')
    }
  })
})
