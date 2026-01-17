import path from 'node:path'
import type { DirectoryNode } from '../types'
import { BaseGenerator, type GeneratorContext } from './BaseGenerator'

/**
 * StandaloneEngineGenerator creates a minimal, high-performance project structure.
 *
 * It uses only the core `Gravito` engine without the full `PlanetCore` overhead,
 * making it ideal for microservices or simple APIs where performance is the
 * top priority.
 *
 * @public
 * @since 3.0.0
 */
export class StandaloneEngineGenerator extends BaseGenerator {
  get architectureType() {
    return 'standalone-engine' as const
  }

  get displayName() {
    return 'Standalone Engine'
  }

  get description() {
    return 'High-performance pure Gravito Engine (minimal)'
  }

  getDirectoryStructure(context: GeneratorContext): DirectoryNode[] {
    return [
      {
        type: 'directory',
        name: 'src',
        children: [
          {
            type: 'file',
            name: 'index.ts',
            content: this.getIndexContent(),
          },
        ],
      },
      {
        type: 'file',
        name: 'README.md',
        content: this.getReadmeContent(context),
      },
    ]
  }

  protected override async generateCommonFiles(context: GeneratorContext): Promise<void> {
    const commonDir = path.resolve(this.config.templatesDir, 'common')
    const extendedContext = { ...context }

    // Generate specialized package.json
    await this.writeFile(context.targetDir, 'package.json', this.generatePackageJson(context))

    // Generate standard tsconfig & gitignore using BaseGenerator's helper
    await this.generateFileFromTemplate(
      commonDir,
      'tsconfig.json.hbs',
      'tsconfig.json',
      extendedContext
    )
    await this.generateFileFromTemplate(commonDir, 'gitignore.hbs', '.gitignore', extendedContext)

    // No need for all the Docker/Architecture/Check scripts overhead for a minimal engine starter
  }

  protected override generatePackageJson(context: GeneratorContext): string {
    const pkg = {
      name: context.nameKebabCase,
      version: '0.1.0',
      type: 'module',
      scripts: {
        dev: 'bun run --watch src/index.ts',
        build: 'bun build ./src/index.ts --outdir ./dist --target bun',
        start: 'bun run dist/index.js',
        test: 'bun test',
      },
      dependencies: {
        '@gravito/core': '^1.1.0',
      },
      devDependencies: {
        'bun-types': 'latest',
        typescript: '^5.0.0',
      },
    }

    return JSON.stringify(pkg, null, 2)
  }

  protected generateArchitectureDoc(_context: GeneratorContext): string {
    return '' // Not used for this generator
  }

  private getIndexContent(): string {
    return `import { Gravito } from '@gravito/core/engine'

const app = new Gravito()

// Basic Route
app.get('/', (c) => c.text('Hello Gravito Engine!'))

// JSON Response
app.get('/json', (c) => c.json({ message: 'High Performance' }))

// Path Parameters
app.get('/user/:name', (c) => {
  const name = c.req.param('name')
  return c.text(\`Hello \${name}\`)
})

export default app
`
  }

  private getReadmeContent(context: GeneratorContext): string {
    return `# ${context.name}

A high-performance web application powered by Gravito Engine.

## Getting Started

### Install Dependencies

 \
 \
bun install
 \
 \

### Run Development Server

 \
 \
bun run dev
 \
 \

### Production Build

 \
 \
bun run build
bun start
 \
 \
`
  }
}
