/**
 * @file packages/cosmos/tests/unit/path-utils.test.ts
 * @description Path utils 單元測試
 */

import { describe, expect, it } from 'bun:test'
import { pathUtils } from '../../src/runtime/path-utils'

describe('Path Utils', () => {
  describe('join', () => {
    it('should join path segments', () => {
      expect(pathUtils.join('foo', 'bar', 'baz.txt')).toBe('foo/bar/baz.txt')
    })

    it('should handle leading slashes', () => {
      expect(pathUtils.join('/foo', 'bar')).toBe('/foo/bar')
    })

    it('should handle trailing slashes', () => {
      expect(pathUtils.join('foo/', 'bar/')).toBe('foo/bar')
    })

    it('should filter empty segments', () => {
      expect(pathUtils.join('', 'foo', '', 'bar')).toBe('foo/bar')
    })

    it('should handle multiple slashes', () => {
      expect(pathUtils.join('foo//bar///baz')).toBe('foo/bar/baz')
    })
  })

  describe('basename', () => {
    it('should return base name', () => {
      expect(pathUtils.basename('/foo/bar/baz.txt')).toBe('baz.txt')
    })

    it('should remove extension if provided', () => {
      expect(pathUtils.basename('/foo/bar/baz.txt', '.txt')).toBe('baz')
    })

    it('should handle trailing slash', () => {
      expect(pathUtils.basename('/foo/bar/')).toBe('bar')
    })

    it('should handle root path', () => {
      expect(pathUtils.basename('/')).toBe('')
    })
  })

  describe('dirname', () => {
    it('should return directory name', () => {
      expect(pathUtils.dirname('/foo/bar/baz.txt')).toBe('/foo/bar')
    })

    it('should handle root path', () => {
      expect(pathUtils.dirname('/foo')).toBe('/')
    })

    it('should handle relative path', () => {
      expect(pathUtils.dirname('foo/bar')).toBe('foo')
    })

    it('should handle single segment', () => {
      expect(pathUtils.dirname('foo')).toBe('.')
    })
  })

  describe('extname', () => {
    it('should return file extension', () => {
      expect(pathUtils.extname('index.html')).toBe('.html')
    })

    it('should handle multiple dots', () => {
      expect(pathUtils.extname('index.coffee.md')).toBe('.md')
    })

    it('should handle dot at end', () => {
      expect(pathUtils.extname('index.')).toBe('.')
    })

    it('should return empty for no extension', () => {
      expect(pathUtils.extname('index')).toBe('')
    })

    it('should handle hidden files', () => {
      // .gitignore 整個被視為副檔名
      expect(pathUtils.extname('.gitignore')).toBe('.gitignore')
    })
  })

  describe('isAbsolute', () => {
    it('should detect Unix absolute path', () => {
      expect(pathUtils.isAbsolute('/foo/bar')).toBe(true)
    })

    it('should detect relative path', () => {
      expect(pathUtils.isAbsolute('foo/bar')).toBe(false)
    })

    it('should detect Windows absolute path', () => {
      expect(pathUtils.isAbsolute('C:/foo/bar')).toBe(true)
      expect(pathUtils.isAbsolute('D:\\foo\\bar')).toBe(true)
    })
  })

  describe('normalize', () => {
    it('should normalize path with dots', () => {
      expect(pathUtils.normalize('/foo/bar//baz/./qux/../quux')).toBe('/foo/bar/baz/quux')
    })

    it('should handle relative path with ..', () => {
      expect(pathUtils.normalize('foo/../bar')).toBe('bar')
    })

    it('should preserve leading .. in relative paths', () => {
      expect(pathUtils.normalize('../foo/bar')).toBe('../foo/bar')
    })

    it('should remove . segments', () => {
      expect(pathUtils.normalize('./foo/./bar/.')).toBe('foo/bar')
    })

    it('should handle absolute path', () => {
      expect(pathUtils.normalize('/foo/bar')).toBe('/foo/bar')
    })

    it('should return . for empty normalized relative path', () => {
      expect(pathUtils.normalize('foo/..')).toBe('.')
    })

    it('should return / for empty normalized absolute path', () => {
      expect(pathUtils.normalize('/foo/..')).toBe('/')
    })
  })
})
