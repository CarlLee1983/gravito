import { describe, expect, it } from 'bun:test'
import { XenonLibraryError, XenonSecurityError } from '../src/errors'
import { LibraryLoader } from '../src/library/LibraryLoader'
import { createMockFfiLoader, TEST_IMPLEMENTATIONS, TEST_SYMBOLS } from './helpers'

describe('LibraryLoader', () => {
  describe('basic loading', () => {
    it('should load a library with mock loader', () => {
      const loader = new LibraryLoader({}, createMockFfiLoader(TEST_IMPLEMENTATIONS))
      const handle = loader.load('test', '/mock/test.so', TEST_SYMBOLS.simple)

      expect(handle.name).toBe('test')
      expect(handle.path).toBe('/mock/test.so')
    })

    it('should cache loaded libraries', () => {
      const loader = new LibraryLoader({}, createMockFfiLoader(TEST_IMPLEMENTATIONS))
      const handle1 = loader.load('test', '/mock/test.so', TEST_SYMBOLS.simple)
      const handle2 = loader.load('test2', '/mock/test.so', TEST_SYMBOLS.simple)

      expect(handle1).toBe(handle2)
    })

    it('should list loaded libraries', () => {
      const loader = new LibraryLoader({}, createMockFfiLoader(TEST_IMPLEMENTATIONS))
      loader.load('lib1', '/mock/lib1.so', TEST_SYMBOLS.simple)
      loader.load('lib2', '/mock/lib2.so', TEST_SYMBOLS.simple)

      const libs = loader.listLibraries()
      expect(libs).toHaveLength(2)
      expect(libs[0][0]).toBe('lib1')
    })
  })

  describe('path validation - whitelist', () => {
    it('should allow whitelisted paths', () => {
      const loader = new LibraryLoader(
        {
          allowedPaths: ['/usr/lib/libtest.so'],
        },
        createMockFfiLoader()
      )

      expect(() => loader.load('test', '/usr/lib/libtest.so', TEST_SYMBOLS.simple)).not.toThrow()
    })

    it('should reject non-whitelisted paths', () => {
      const loader = new LibraryLoader(
        {
          allowedPaths: ['/usr/lib/libtest.so'],
        },
        createMockFfiLoader()
      )

      expect(() => loader.load('test', '/tmp/libtest.so', TEST_SYMBOLS.simple)).toThrow(
        XenonSecurityError
      )
    })

    it('should allow any path when whitelist is empty', () => {
      const loader = new LibraryLoader({}, createMockFfiLoader())

      expect(() => loader.load('test', '/tmp/anything.so', TEST_SYMBOLS.simple)).not.toThrow()
    })
  })

  describe('path validation - blacklist', () => {
    it('should reject blacklisted paths', () => {
      const loader = new LibraryLoader(
        {
          blockedPaths: ['/etc/sensitive.so'],
        },
        createMockFfiLoader()
      )

      expect(() => loader.load('test', '/etc/sensitive.so', TEST_SYMBOLS.simple)).toThrow(
        XenonSecurityError
      )
    })

    it('should allow non-blacklisted paths', () => {
      const loader = new LibraryLoader(
        {
          blockedPaths: ['/etc/sensitive.so'],
        },
        createMockFfiLoader()
      )

      expect(() => loader.load('test', '/usr/lib/safe.so', TEST_SYMBOLS.simple)).not.toThrow()
    })
  })

  describe('path validation - wildcards', () => {
    it('should support wildcard patterns in whitelist', () => {
      const loader = new LibraryLoader(
        {
          allowedPaths: ['/usr/lib/lib*.so'],
        },
        createMockFfiLoader()
      )

      expect(() => loader.load('test', '/usr/lib/libtest.so', TEST_SYMBOLS.simple)).not.toThrow()
    })

    it('should support wildcard patterns in blacklist', () => {
      const loader = new LibraryLoader(
        {
          blockedPaths: ['/tmp/lib*.so'],
        },
        createMockFfiLoader()
      )

      expect(() => loader.load('test', '/tmp/libtest.so', TEST_SYMBOLS.simple)).toThrow(
        XenonSecurityError
      )
    })
  })

  describe('symbol validation', () => {
    it('should reject invalid symbols', () => {
      const loader = new LibraryLoader({}, createMockFfiLoader())

      expect(() =>
        loader.load('test', '/mock/test.so', {
          bad: {
            args: ['callback'],
            returns: 'void',
          },
        })
      ).toThrow()
    })
  })

  describe('library limits', () => {
    it('should enforce maximum library count', () => {
      const loader = new LibraryLoader({ maxLibraries: 2 }, createMockFfiLoader())

      loader.load('lib1', '/mock/lib1.so', TEST_SYMBOLS.simple)
      loader.load('lib2', '/mock/lib2.so', TEST_SYMBOLS.simple)

      expect(() => loader.load('lib3', '/mock/lib3.so', TEST_SYMBOLS.simple)).toThrow()
    })
  })

  describe('unload', () => {
    it('should unload libraries', () => {
      const loader = new LibraryLoader({}, createMockFfiLoader())
      loader.load('test', '/mock/test.so', TEST_SYMBOLS.simple)

      loader.unload('/mock/test.so')

      const handle = loader.getHandle('/mock/test.so')
      expect(handle).toBeUndefined()
    })

    it('should allow reloading after unload', () => {
      const loader = new LibraryLoader({}, createMockFfiLoader())
      loader.load('test', '/mock/test.so', TEST_SYMBOLS.simple)
      loader.unload('/mock/test.so')

      expect(() => loader.load('test', '/mock/test.so', TEST_SYMBOLS.simple)).not.toThrow()
    })
  })

  describe('closeAll', () => {
    it('should close all libraries', () => {
      const loader = new LibraryLoader({}, createMockFfiLoader())
      loader.load('lib1', '/mock/lib1.so', TEST_SYMBOLS.simple)
      loader.load('lib2', '/mock/lib2.so', TEST_SYMBOLS.simple)

      loader.closeAll()

      expect(loader.listLibraries()).toHaveLength(0)
    })
  })
})
