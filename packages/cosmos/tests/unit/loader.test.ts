import { describe, expect, it, mock, spyOn } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { I18nManager } from '../../src/I18nService'
import * as loader from '../../src/loader'

describe('I18n Loading', () => {
  describe('Loading Coalescing', () => {
    it('should coalesce concurrent load requests', async () => {
      // We use spyOn instead of mock.module to avoid affecting other tests in same process if bun test runs them together
      const loadLocaleSpy = spyOn(loader, 'loadLocale').mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
        return { title: 'Loaded' }
      })

      const manager = new I18nManager({
        defaultLocale: 'en',
        supportedLocales: ['en'],
        lazyLoad: { baseDir: '/tmp' },
      })

      const p1 = manager.ensureLocale('en')
      const p2 = manager.ensureLocale('en')

      await Promise.all([p1, p2])

      expect(loadLocaleSpy).toHaveBeenCalledTimes(1)
      loadLocaleSpy.mockRestore()
    })
  })

  describe('loadTranslations', () => {
    it('loads json translation files from a directory', async () => {
      const tmpDir = mkdtempSync(join(tmpdir(), 'gravito-i18n-'))

      try {
        writeFileSync(join(tmpDir, 'en.json'), JSON.stringify({ hello: 'Hello' }))
        writeFileSync(join(tmpDir, 'zh.json'), JSON.stringify({ hello: '你好' }))

        const translations = await loader.loadTranslations(tmpDir)

        expect(translations.en.hello).toBe('Hello')
        expect(translations.zh.hello).toBe('你好')
      } finally {
        await rm(tmpDir, { force: true, recursive: true })
      }
    })

    it('skips invalid json files and returns empty for missing dir', async () => {
      const tmpDir = mkdtempSync(join(tmpdir(), 'gravito-i18n-invalid-'))

      const errorSpy = spyOn(console, 'error').mockImplementation(() => {})
      const warnSpy = spyOn(console, 'warn').mockImplementation(() => {})

      try {
        writeFileSync(join(tmpDir, 'en.json'), '{invalid json}')
        const translations = await loader.loadTranslations(tmpDir)
        expect(translations.en).toBeUndefined()

        const missing = await loader.loadTranslations(join(tmpDir, 'missing'))
        expect(missing).toEqual({})
      } finally {
        errorSpy.mockRestore()
        warnSpy.mockRestore()
        await rm(tmpDir, { force: true, recursive: true })
      }
    })
  })
})
