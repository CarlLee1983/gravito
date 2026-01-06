/**
 * BaseGenerator - Abstract base class for architecture generators.
 *
 * Provides common functionality for generating project structures,
 * including directory creation, file generation, and context management.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { FileMerger } from '../FileMerger'
import type { ArchitectureType, DirectoryNode } from '../types'
import { StubGenerator, type StubVariables } from './StubGenerator'

// Helper for recursive directory walking
async function walk(dir: string): Promise<string[]> {
  const files = await fs.readdir(dir)
  const paths: string[] = []
  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = await fs.stat(filePath)
    if (stat.isDirectory()) {
      paths.push(...(await walk(filePath)))
    } else {
      paths.push(filePath)
    }
  }
  return paths
}

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
  protected fileMerger: FileMerger
  protected filesCreated: string[] = []

  constructor(config: GeneratorConfig) {
    this.config = config
    this.stubGenerator = new StubGenerator({
      stubsDir: config.templatesDir,
      outputDir: '', // Set per-generation
    })
    this.fileMerger = new FileMerger()
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

    // Apply Profile Overlays
    await this.applyOverlays(context)

    // Apply Feature Overlays
    await this.applyFeatureOverlays(context)

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

    // Docker files
    await this.writeFile(context.targetDir, 'Dockerfile', this.generateDockerfile(context))
    await this.writeFile(context.targetDir, '.dockerignore', this.generateDockerIgnore())

    // ARCHITECTURE.md
    await this.writeFile(
      context.targetDir,
      'ARCHITECTURE.md',
      this.generateArchitectureDoc(context)
    )
  }

  /**
   * Apply profile-specific overlays
   */
  protected async applyOverlays(context: GeneratorContext): Promise<void> {
    const profile = context.profile as string
    if (!profile) return

    const overlayDir = path.resolve(this.config.templatesDir, 'overlays', profile)
    await this.copyOverlayDirectory(overlayDir, context)
  }

  /**
   * Apply feature-specific overlays
   */
  protected async applyFeatureOverlays(context: GeneratorContext): Promise<void> {
    const features = (context.features as string[]) || []
    for (const feature of features) {
      const overlayDir = path.resolve(this.config.templatesDir, 'features', feature)
      await this.copyOverlayDirectory(overlayDir, context)
    }
  }

  /**
   * Helper to copy/merge an overlay directory into the target
   */
  protected async copyOverlayDirectory(
    sourceDir: string,
    context: GeneratorContext
  ): Promise<void> {
    try {
      await fs.access(sourceDir)
    } catch {
      // Overlay does not exist, skip
      return
    }

    const files = await walk(sourceDir)
    for (const filePath of files) {
      const relativePath = path.relative(sourceDir, filePath)

      // Read source content
      let content = await fs.readFile(filePath, 'utf-8')

      // Process if it's a template?
      // For overlays, we generally assume they might be templates too.
      // But maybe we keep it simple for now.
      // If we want templating in overlays, we can use StubGenerator.
      try {
        content = this.stubGenerator.render(content, context as unknown as StubVariables)
      } catch {
        // Ignore render errors (might not be a template)
      }

      await this.writeFile(context.targetDir, relativePath, content)
    }
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

    let finalContent = content

    // Check if file exists (merge if so)
    try {
      const existingContent = await fs.readFile(fullPath, 'utf-8')
      finalContent = this.fileMerger.merge(relativePath, existingContent, content)
      if (finalContent !== content) {
        this.log(`🔄 Merged file: ${relativePath}`)
      }
    } catch {
      // File doesn't exist, just write
    }

    await fs.writeFile(fullPath, finalContent, 'utf-8')
    this.filesCreated.push(fullPath)
    this.log(`📄 Created file: ${relativePath}`)
  }

  /**
   * Generate package.json content.
   */
  protected generatePackageJson(context: GeneratorContext): string {
    const profile = (context.profile as string) || 'core'

    // Base dependencies for all profiles
    const baseDependencies: Record<string, string> = {
      '@gravito/core': '^1.0.0-beta.5',
      '@gravito/atlas': '^1.0.0-beta.5',
      '@gravito/plasma': '^1.0.0-beta.5',
      '@gravito/stream': '^1.0.0-beta.5',
    }

    // Profile-specific dependencies
    if (profile === 'enterprise' || profile === 'scale') {
      baseDependencies['@gravito/quasar'] = '^1.0.0-beta.5'
      baseDependencies['@gravito/horizon'] = '^1.0.0-beta.5'
    }

    // Additional optional dependencies
    if (context.withSpectrum) {
      baseDependencies['@gravito/spectrum'] = '^1.0.0-beta.1'
    }

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
        'docker:build': `docker build -t ${context.nameKebabCase} .`,
        'docker:run': `docker run -it -p 3000:3000 ${context.nameKebabCase}`,
      },
      dependencies: baseDependencies,
      devDependencies: {
        'bun-types': 'latest',
        typescript: '^5.0.0',
      },
    }

    return JSON.stringify(pkg, null, 2)
  }

  /**
   * Generate Dockerfile content.
   */
  protected generateDockerfile(context: GeneratorContext): string {
    const entrypoint = context.architecture === 'ddd' ? 'dist/main.js' : 'dist/bootstrap.js'

    return `FROM oven/bun:1.0 AS base
WORKDIR /usr/src/app

# Install dependencies
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Build application
FROM base AS build
COPY --from=install /temp/dev/node_modules node_modules
COPY . .
ENV NODE_ENV=production
RUN bun run build

# Final production image
FROM base AS release
COPY --from=build /usr/src/app/${entrypoint} index.js
COPY --from=build /usr/src/app/package.json .

# Create a non-root user for security
USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "index.js" ]
`
  }

  /**
   * Generate .dockerignore content.
   */
  protected generateDockerIgnore(): string {
    return `node_modules
dist
.git
.env
*.log
.vscode
.idea
tests
`
  }

  /**
   * Generate .env.example content.
   */
  protected generateEnvExample(context: GeneratorContext): string {
    const profile = (context.profile as string) || 'core'

    // Base configuration for all profiles
    let envContent = `# ============================================================================
# Application Configuration
# ============================================================================

APP_NAME=${context.name}
APP_ENV=development
APP_DEBUG=true
APP_URL=http://localhost:3000
APP_KEY=

# ============================================================================
# Database Configuration
# ============================================================================

# Database Connection (sqlite, postgres, mysql)
DB_CONNECTION=${profile === 'core' ? 'sqlite' : 'postgres'}

# SQLite Configuration (when DB_CONNECTION=sqlite)
DB_DATABASE=database/database.sqlite

# PostgreSQL Configuration (when DB_CONNECTION=postgres)
${
  profile !== 'core'
    ? `DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=${context.name}
DB_USERNAME=postgres
DB_PASSWORD=
DB_SSLMODE=prefer`
    : `# DB_HOST=127.0.0.1
# DB_PORT=5432
# DB_DATABASE=${context.name}
# DB_USERNAME=postgres
# DB_PASSWORD=
# DB_SSLMODE=prefer`
}

# MySQL Configuration (when DB_CONNECTION=mysql)
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=${context.name}
# DB_USERNAME=root
# DB_PASSWORD=

# ============================================================================
# Redis Configuration (@gravito/plasma)
# ============================================================================

# Default Redis Connection
REDIS_CONNECTION=default
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Redis Connection Options
REDIS_CONNECT_TIMEOUT=10000
REDIS_COMMAND_TIMEOUT=5000
REDIS_KEY_PREFIX=
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY=1000

# Cache-specific Redis Connection (optional, falls back to default)
# REDIS_CACHE_HOST=127.0.0.1
# REDIS_CACHE_PORT=6379
# REDIS_CACHE_PASSWORD=
REDIS_CACHE_DB=1

# Queue-specific Redis Connection (optional, falls back to default)
# REDIS_QUEUE_HOST=127.0.0.1
# REDIS_QUEUE_PORT=6379
# REDIS_QUEUE_PASSWORD=
REDIS_QUEUE_DB=2

# ============================================================================
# Cache Configuration (@gravito/stasis)
# ============================================================================

# Cache Driver (memory, file, redis)
CACHE_DRIVER=${profile === 'core' ? 'memory' : 'redis'}

# File Cache Path (when CACHE_DRIVER=file)
CACHE_PATH=storage/framework/cache

# Redis Cache Configuration (when CACHE_DRIVER=redis)
REDIS_CACHE_CONNECTION=cache
REDIS_CACHE_PREFIX=cache:

# ============================================================================
# Queue Configuration (@gravito/stream)
# ============================================================================

# Queue Connection (sync, memory, database, redis, kafka, sqs, rabbitmq)
QUEUE_CONNECTION=${profile === 'core' ? 'sync' : 'redis'}

# Database Queue Configuration (when QUEUE_CONNECTION=database)
QUEUE_TABLE=jobs

# Redis Queue Configuration (when QUEUE_CONNECTION=redis)
REDIS_PREFIX=queue:

`

    // Add profile-specific configurations
    if (profile === 'enterprise' || profile === 'scale') {
      envContent += `# Kafka Queue Configuration (when QUEUE_CONNECTION=kafka)
# KAFKA_BROKERS=localhost:9092
# KAFKA_CONSUMER_GROUP_ID=gravito-workers
# KAFKA_CLIENT_ID=${context.name}

# AWS SQS Queue Configuration (when QUEUE_CONNECTION=sqs)
# AWS_REGION=us-east-1
# SQS_QUEUE_URL_PREFIX=
# SQS_VISIBILITY_TIMEOUT=30
# SQS_WAIT_TIME_SECONDS=20

# RabbitMQ Queue Configuration (when QUEUE_CONNECTION=rabbitmq)
# RABBITMQ_URL=amqp://localhost
# RABBITMQ_EXCHANGE=gravito.events
# RABBITMQ_EXCHANGE_TYPE=fanout

`
    }

    // Add logging configuration
    envContent += `# ============================================================================
# Logging Configuration
# ============================================================================

LOG_LEVEL=debug
`

    return envContent
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
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        types: ['bun-types'],
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
