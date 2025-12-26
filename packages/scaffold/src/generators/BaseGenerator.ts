/**
 * BaseGenerator - Abstract base class for architecture generators.
 *
 * Provides common functionality for generating project structures,
 * including directory creation, file generation, and context management.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import type { ArchitectureType, DirectoryNode } from '../types'
import { StubGenerator, type StubVariables } from './StubGenerator'

/**
 * Context passed to generators during scaffolding.
 */
export interface GeneratorContext {
  /**
   * Project name
   */
  name: string

  /**
   * Project name in various cases
   */
  namePascalCase: string
  nameCamelCase: string
  nameSnakeCase: string
  nameKebabCase: string

  /**
   * Target directory
   */
  targetDir: string

  /**
   * Architecture type
   */
  architecture: ArchitectureType

  /**
   * Package manager
   */
  packageManager: 'bun' | 'npm' | 'yarn' | 'pnpm'

  /**
   * Current year (for license headers)
   */
  year: string

  /**
   * Current date
   */
  date: string

  /**
   * Additional custom context
   */
  [key: string]: unknown
}

/**
 * Configuration for generators.
 */
export interface GeneratorConfig {
  /**
   * Directory containing stub templates
   */
  templatesDir: string

  /**
   * Verbose logging
   */
  verbose?: boolean
}

/**
 * Abstract base class for architecture generators.
 */
export abstract class BaseGenerator {
  protected config: GeneratorConfig
  protected stubGenerator: StubGenerator
  protected filesCreated: string[] = []

  constructor(config: GeneratorConfig) {
    this.config = config
    this.stubGenerator = new StubGenerator({
      stubsDir: config.templatesDir,
      outputDir: '', // Set per-generation
    })
  }

  /**
   * Get the architecture type this generator handles.
   */
  abstract get architectureType(): ArchitectureType

  /**
   * Get the display name for this architecture.
   */
  abstract get displayName(): string

  /**
   * Get the description for this architecture.
   */
  abstract get description(): string

  /**
   * Get the directory structure for this architecture.
   */
  abstract getDirectoryStructure(context: GeneratorContext): DirectoryNode[]

  /**
   * Generate the project scaffold.
   *
   * @param context - Generator context
   * @returns Array of created file paths
   */
  async generate(context: GeneratorContext): Promise<string[]> {
    this.filesCreated = []

    // Create directory structure
    const structure = this.getDirectoryStructure(context)
    await this.createStructure(context.targetDir, structure, context)

    // Generate common files
    await this.generateCommonFiles(context)

    return this.filesCreated
  }

  /**
   * Create directory structure recursively.
   */
  protected async createStructure(
    basePath: string,
    nodes: DirectoryNode[],
    context: GeneratorContext
  ): Promise<void> {
    for (const node of nodes) {
      const fullPath = path.resolve(basePath, node.name)

      if (node.type === 'directory') {
        await fs.mkdir(fullPath, { recursive: true })
        this.log(`📁 Created directory: ${node.name}`)

        if (node.children) {
          await this.createStructure(fullPath, node.children, context)
        }
      } else {
        // File
        await fs.mkdir(path.dirname(fullPath), { recursive: true })

        if (node.template) {
          // Generate from template
          const templatePath = path.resolve(this.config.templatesDir, node.template)
          try {
            const template = await fs.readFile(templatePath, 'utf-8')
            const content = this.stubGenerator.render(template, context as unknown as StubVariables)
            await fs.writeFile(fullPath, content, 'utf-8')
          } catch {
            // Template not found, use content or create empty
            await fs.writeFile(fullPath, node.content ?? '', 'utf-8')
          }
        } else if (node.content) {
          await fs.writeFile(fullPath, node.content, 'utf-8')
        } else {
          // Create empty file
          await fs.writeFile(fullPath, '', 'utf-8')
        }

        this.filesCreated.push(fullPath)
        this.log(`📄 Created file: ${node.name}`)
      }
    }
  }

  /**
   * Generate common files (package.json, .env, etc.)
   */
  protected async generateCommonFiles(context: GeneratorContext): Promise<void> {
    // package.json
    await this.writeFile(context.targetDir, 'package.json', this.generatePackageJson(context))

    // .env.example
    await this.writeFile(context.targetDir, '.env.example', this.generateEnvExample(context))

    // .env (copy of example)
    await this.writeFile(context.targetDir, '.env', this.generateEnvExample(context))

    // .gitignore
    await this.writeFile(context.targetDir, '.gitignore', this.generateGitignore())

    // tsconfig.json
    await this.writeFile(context.targetDir, 'tsconfig.json', this.generateTsConfig())

    // ARCHITECTURE.md
    await this.writeFile(
      context.targetDir,
      'ARCHITECTURE.md',
      this.generateArchitectureDoc(context)
    )
  }

  /**
   * Write a file and track it.
   */
  protected async writeFile(
    basePath: string,
    relativePath: string,
    content: string
  ): Promise<void> {
    const fullPath = path.resolve(basePath, relativePath)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, content, 'utf-8')
    this.filesCreated.push(fullPath)
    this.log(`📄 Created file: ${relativePath}`)
  }

  /**
   * Generate package.json content.
   */
  protected generatePackageJson(context: GeneratorContext): string {
    const pkg = {
      name: context.nameKebabCase,
      version: '0.1.0',
      type: 'module',
      scripts: {
        dev: 'bun run --watch src/bootstrap.ts',
        build: 'bun build ./src/bootstrap.ts --outdir ./dist --target bun',
        start: 'bun run dist/bootstrap.js',
        test: 'bun test',
        typecheck: 'tsc --noEmit',
      },
      dependencies: {
        'gravito-core': '^1.0.0-beta.5',
      },
      devDependencies: {
        '@types/bun': 'latest',
        typescript: '^5.0.0',
      },
    }

    return JSON.stringify(pkg, null, 2)
  }

  /**
   * Generate .env.example content.
   */
  protected generateEnvExample(context: GeneratorContext): string {
    return `# Application
APP_NAME="${context.name}"
APP_ENV=development
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:3000

# Server
PORT=3000

# Database
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite

# Cache
CACHE_DRIVER=memory

# Logging
LOG_LEVEL=debug
`
  }

  /**
   * Generate .gitignore content.
   */
  protected generateGitignore(): string {
    return `# Dependencies
node_modules/

# Build output
dist/

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# System
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Database
*.sqlite
*.sqlite-journal

# Coverage
coverage/
`
  }

  /**
   * Generate tsconfig.json content.
   */
  protected generateTsConfig(): string {
    const config = {
      compilerOptions: {
        target: 'ESNext',
        module: 'ESNext',
        moduleResolution: 'bundler',
        esModuleInterop: true,
        strict: true,
        skipLibCheck: true,
        declaration: true,
        outDir: './dist',
        rootDir: './src',
        baseUrl: '.',
        paths: {
          '@/*': ['./src/*'],
        },
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist'],
    }

    return JSON.stringify(config, null, 2)
  }

  /**
   * Generate ARCHITECTURE.md content.
   * Override in subclasses for architecture-specific docs.
   */
  protected abstract generateArchitectureDoc(context: GeneratorContext): string

  /**
   * Log a message if verbose mode is enabled.
   */
  protected log(message: string): void {
    if (this.config.verbose) {
      console.log(message)
    }
  }

  /**
   * Create generator context from options.
   */
  static createContext(
    name: string,
    targetDir: string,
    architecture: ArchitectureType,
    packageManager: 'bun' | 'npm' | 'yarn' | 'pnpm' = 'bun',
    extra: Record<string, unknown> = {}
  ): GeneratorContext {
    const now = new Date()

    // Convert name to various cases
    const pascalCase = name
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^./, (c) => c.toUpperCase())

    const camelCase = pascalCase.replace(/^./, (c) => c.toLowerCase())

    const snakeCase = name
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
      .replace(/[-\s]+/g, '_')

    const kebabCase = name
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '')
      .replace(/[_\s]+/g, '-')

    return {
      name,
      namePascalCase: pascalCase,
      nameCamelCase: camelCase,
      nameSnakeCase: snakeCase,
      nameKebabCase: kebabCase,
      targetDir,
      architecture,
      packageManager,
      year: now.getFullYear().toString(),
      date: now.toISOString().split('T')[0] ?? now.toISOString().slice(0, 10),
      ...extra,
    }
  }
}
