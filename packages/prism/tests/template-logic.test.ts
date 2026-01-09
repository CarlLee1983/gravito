import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { TemplateEngine } from '../src/TemplateEngine'

let viewsDir = ''

beforeAll(async () => {
  viewsDir = mkdtempSync(join(tmpdir(), 'gravito-prism-'))
  const template = [
    '{{#each items}}<p>{{this}}</p>{{/each}}',
    '{{#if show}}YES{{else}}NO{{/if}}',
    '{{#unless hide}}VISIBLE{{/unless}}',
    '{{greet name="Carl" count=2 enabled=true}}',
    '{{explode name="bad"}}',
    '{{missing foo=1}}',
    '{{{rawHtml}}} {{escaped}}',
  ].join('\n')

  writeFileSync(join(viewsDir, 'page.html'), template, 'utf-8')
})

afterAll(async () => {
  if (viewsDir) {
    await rm(viewsDir, { recursive: true, force: true })
  }
})

describe('TemplateEngine logic', () => {
  it('processes loops, conditionals, helpers, and interpolation', () => {
    const engine = new TemplateEngine(viewsDir)
    const captured: Record<string, unknown> = {}
    engine.registerHelper('greet', (args) => {
      Object.assign(captured, args)
      return `Hi ${args.name}`
    })
    engine.registerHelper('explode', () => {
      throw new Error('boom')
    })

    const originalError = console.error
    console.error = mock(() => {})

    const output = engine.render('page', {
      items: [1, 'two'],
      show: true,
      hide: false,
      rawHtml: '<em>raw</em>',
      escaped: '<strong>safe</strong>',
    })

    console.error = originalError

    expect(output).toContain('<p>1</p>')
    expect(output).toContain('<p>two</p>')
    expect(output).toContain('YES')
    expect(output).toContain('VISIBLE')
    expect(output).toContain('Hi Carl')
    expect(output).toContain('{{missing foo=1}}')
    expect(output).toContain('<em>raw</em>')
    expect(output).toContain('&lt;strong&gt;safe&lt;/strong&gt;')

    expect(captured).toMatchObject({ name: 'Carl', count: 2, enabled: true })
  })
})
