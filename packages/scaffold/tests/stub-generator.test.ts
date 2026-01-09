import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { StubGenerator } from '../src/generators/StubGenerator'

let stubsDir = ''
let outputDir = ''

beforeAll(async () => {
  stubsDir = await mkdtemp(join(tmpdir(), 'gravito-stubs-'))
  outputDir = await mkdtemp(join(tmpdir(), 'gravito-stubs-out-'))
  await writeFile(
    join(stubsDir, 'example.stub'),
    'Hello {{capitalize name}} {{pluralize item}} {{uppercase name}}',
    'utf-8'
  )
})

afterAll(async () => {
  if (stubsDir) {
    await rm(stubsDir, { recursive: true, force: true })
  }
  if (outputDir) {
    await rm(outputDir, { recursive: true, force: true })
  }
})

describe('StubGenerator', () => {
  it('renders templates with helpers', () => {
    const generator = new StubGenerator({
      stubsDir,
      outputDir,
      defaultVariables: { item: 'category' },
    })

    const rendered = generator.render('{{camelCase name}} {{snakeCase name}}', {
      name: 'Hello World',
    })
    expect(rendered).toBe('helloWorld hello__world')
  })

  it('generates files from stubs', async () => {
    const generator = new StubGenerator({ stubsDir, outputDir })
    const outputPath = await generator.generate('example.stub', 'out.txt', {
      name: 'world',
      item: 'story',
    })

    const content = await readFile(outputPath, 'utf-8')
    expect(content).toContain('Hello World stories WORLD')
  })

  it('generates multiple files and supports helpers', async () => {
    const generator = new StubGenerator({
      stubsDir,
      outputDir,
      helpers: {
        shout: (value: string) => value.toUpperCase(),
      },
    })

    const template = 'Say {{shout name}}'
    await writeFile(join(stubsDir, 'shout.stub'), template, 'utf-8')

    const results = await generator.generateMany('shout.stub', [
      ['a.txt', { name: 'hi' }],
      ['b.txt', { name: 'bye' }],
    ])

    expect(results.length).toBe(2)
    expect(await readFile(join(outputDir, 'a.txt'), 'utf-8')).toContain('HI')
    expect(await readFile(join(outputDir, 'b.txt'), 'utf-8')).toContain('BYE')
  })

  it('registers helpers and partials', () => {
    const generator = new StubGenerator({ stubsDir, outputDir })
    generator.registerHelper('shout', (value: string) => value.toUpperCase())
    generator.registerPartial('greeting', 'Hello {{name}}')

    const rendered = generator.render('{{> greeting}} {{shout name}} {{date "year"}}', {
      name: 'world',
    })

    expect(rendered).toContain('Hello world')
    expect(rendered).toContain('WORLD')
    expect(rendered).toContain(new Date().getFullYear().toString())
  })
})
