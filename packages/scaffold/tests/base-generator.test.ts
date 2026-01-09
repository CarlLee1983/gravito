import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BaseGenerator } from '../src/generators/BaseGenerator'
import type { ArchitectureType, DirectoryNode } from '../src/types'

class DummyGenerator extends BaseGenerator {
  get architectureType(): ArchitectureType {
    return 'clean'
  }

  get displayName(): string {
    return 'Dummy'
  }

  get description(): string {
    return 'Dummy generator'
  }

  getDirectoryStructure(): DirectoryNode[] {
    return [
      {
        type: 'directory',
        name: 'src',
        children: [
          {
            type: 'file',
            name: 'index.ts',
            template: 'index.stub',
          },
        ],
      },
      {
        type: 'file',
        name: 'README.md',
        content: '# Hello',
      },
      {
        type: 'file',
        name: 'LICENSE',
        template: 'missing.stub',
        content: 'Fallback License',
      },
    ]
  }

  protected generateArchitectureDoc(context: any): string {
    return `Architecture: ${context.architecture}`
  }
}

let tempDir = ''
let templatesDir = ''

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'gravito-scaffold-'))
  templatesDir = await mkdtemp(join(tmpdir(), 'gravito-scaffold-templates-'))
  await writeFile(join(templatesDir, 'index.stub'), 'export const name = "{{name}}"\n', 'utf-8')
})

afterAll(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true })
  }
  if (templatesDir) {
    await rm(templatesDir, { recursive: true, force: true })
  }
})

describe('BaseGenerator', () => {
  it('creates context with name variants', () => {
    const context = BaseGenerator.createContext('my app', tempDir, 'clean', 'bun')

    expect(context.namePascalCase).toBe('MyApp')
    expect(context.nameCamelCase).toBe('myApp')
    expect(context.nameSnakeCase).toBe('my_app')
    expect(context.nameKebabCase).toBe('my-app')
  })

  it('generates structure and common files', async () => {
    const originalLog = console.log
    console.log = mock(() => {})

    const generator = new DummyGenerator({ templatesDir, verbose: true })
    const context = {
      ...BaseGenerator.createContext('Demo App', tempDir, 'clean', 'bun'),
      withSpectrum: true,
    }

    const files = await generator.generate(context)

    console.log = originalLog

    expect(files.some((file) => file.endsWith('README.md'))).toBe(true)
    expect(files.some((file) => file.endsWith('package.json'))).toBe(true)

    const indexFile = await readFile(join(tempDir, 'src', 'index.ts'), 'utf-8')
    expect(indexFile).toContain('Demo App')

    const licenseFile = await readFile(join(tempDir, 'LICENSE'), 'utf-8')
    expect(licenseFile).toBe('Fallback License')

    const pkg = JSON.parse(await readFile(join(tempDir, 'package.json'), 'utf-8'))
    expect(pkg.dependencies['@gravito/spectrum']).toBeDefined()
  })
})
