import { describe, expect, it } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { I18nManager } from '../../src/I18nService'

describe('Lazy Loading', () => {
  it('loads translations on demand', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'gravito-i18n-lazy-'))

    try {
      writeFileSync(join(tmpDir, 'fr.json'), JSON.stringify({ greeting: 'Bonjour' }))

      const manager = new I18nManager({
        defaultLocale: 'en',
        supportedLocales: ['en', 'fr'],
        lazyLoad: {
          baseDir: tmpDir,
        },
      })

      expect(manager.translate('fr', 'greeting')).toBe('greeting')

      await manager.ensureLocale('fr')

      expect(manager.translate('fr', 'greeting')).toBe('Bonjour')

      await manager.ensureLocale('fr')
      expect(manager.translate('fr', 'greeting')).toBe('Bonjour')
    } finally {
      await rm(tmpDir, { force: true, recursive: true })
    }
  })
})
