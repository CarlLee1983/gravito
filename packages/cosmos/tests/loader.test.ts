import { describe, expect, it, jest } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadTranslations } from '../src/loader'

describe('loadTranslations', () => {
  it('loads json translation files from a directory', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'gravito-i18n-'))

    try {
      writeFileSync(join(tmpDir, 'en.json'), JSON.stringify({ hello: 'Hello' }))
      writeFileSync(join(tmpDir, 'zh.json'), JSON.stringify({ hello: '你好' }))

      const translations = await loadTranslations(tmpDir)

      expect(translations.en.hello).toBe('Hello')
      expect(translations.zh.hello).toBe('你好')
    } finally {
      await rm(tmpDir, { force: true, recursive: true })
    }
  })

  it('skips invalid json files and returns empty for missing dir', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'gravito-i18n-invalid-'))

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      writeFileSync(join(tmpDir, 'en.json'), '{invalid json}')
      const translations = await loadTranslations(tmpDir)
      expect(translations.en).toBeUndefined()

      const missing = await loadTranslations(join(tmpDir, 'missing'))
      expect(missing).toEqual({})
    } finally {
      errorSpy.mockRestore()
      warnSpy.mockRestore()
      await rm(tmpDir, { force: true, recursive: true })
    }
  })
})
