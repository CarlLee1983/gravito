/**
 * BaseGenerator - Abstract base class for architecture generators.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { FileMerger } from '../FileMerger'
import type { ArchitectureType, DirectoryNode } from '../types'
import { FileUtilities } from '../utils/FileUtilities'
import { TemplateManager } from '../utils/TemplateManager'

export interface GeneratorContext {
  name: string
  namePascalCase: string
  nameCamelCase: string
  nameSnakeCase: string
  nameKebabCase: string
  targetDir: string
  architecture: ArchitectureType
  packageManager: 'bun' | 'npm' | 'yarn' | 'pnpm'
  year: string
  date: string
  [key: string]: unknown
}

export interface GeneratorConfig {
  templatesDir: string
  verbose?: boolean
}

export abstract class BaseGenerator {
  protected config: GeneratorConfig
  protected templateManager: TemplateManager
  protected fileMerger: FileMerger
  protected filesCreated: string[] = []

  constructor(config: GeneratorConfig) {
    this.config = config
    this.templateManager = new TemplateManager(config.templatesDir)
    this.fileMerger = new FileMerger()
  }

  abstract get architectureType(): ArchitectureType
  abstract get displayName(): string
  abstract get description(): string
  abstract getDirectoryStructure(context: GeneratorContext): DirectoryNode[]

  async generate(context: GeneratorContext): Promise<string[]> {
    this.filesCreated = []
    const structure = this.getDirectoryStructure(context)
    await this.createStructure(context.targetDir, structure, context)
    await this.generateCommonFiles(context)
    await this.applyOverlays(context)
    await this.applyFeatureOverlays(context)
    return this.filesCreated
  }

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
        await fs.mkdir(path.dirname(fullPath), { recursive: true })
        let content = ''
        if (node.template) {
          try {
            const templatePath = path.resolve(this.config.templatesDir, node.template)
            const template = await fs.readFile(templatePath, 'utf-8')
            content = this.templateManager.render(template, context)
          } catch {
            content = node.content ?? ''
          }
        } else {
          content = node.content ?? ''
        }

        const relativePath = path.relative(context.targetDir, fullPath)
        const writtenPath = await FileUtilities.writeFile(
          context.targetDir,
          relativePath,
          content,
          this.fileMerger,
          (msg) => this.log(msg)
        )
        this.filesCreated.push(writtenPath)
      }
    }
  }

  protected async generateCommonFiles(context: GeneratorContext): Promise<void> {
    const commonDir = path.resolve(this.config.templatesDir, 'common')

    // Prepare extended context for templates
    const extendedContext = {
      ...context,
      entrypoint: context.architecture === 'ddd' ? 'dist/main.js' : 'dist/bootstrap.js',
      dbConnection: (context.profile as string) === 'core' ? 'sqlite' : 'postgres',
    }

    // Generate files from templates
    await this.generateFileFromTemplate(
      commonDir,
      'env.example.hbs',
      '.env.example',
      extendedContext
    )
    await this.generateFileFromTemplate(commonDir, 'env.example.hbs', '.env', extendedContext)
    await this.generateFileFromTemplate(commonDir, 'gitignore.hbs', '.gitignore', extendedContext)
    await this.generateFileFromTemplate(
      commonDir,
      'tsconfig.json.hbs',
      'tsconfig.json',
      extendedContext
    )
    await this.generateFileFromTemplate(commonDir, 'Dockerfile.hbs', 'Dockerfile', extendedContext)

    // Package.json needs special handling or a template
    await this.writeFile(context.targetDir, 'package.json', this.generatePackageJson(context))

    await this.writeFile(
      context.targetDir,
      '.dockerignore',
      `node_modules
dist
.git
.env
`
    )
    await this.writeFile(
      context.targetDir,
      'ARCHITECTURE.md',
      this.generateArchitectureDoc(context)
    )

    await this.writeFile(
      context.targetDir,
      'tests/Example.test.ts',
      `import { describe, it, expect } from 'bun:test'\n\ndescribe('Example Test', () => {\n  it('should pass', () => {\n    expect(true).toBe(true)\n  })\n})\n`
    )

    await this.generateCheckScripts(context)
    await this.generateSkills(context)
  }

  protected async generateFileFromTemplate(
    tplDir: string,
    tplName: string,
    targetName: string,
    context: GeneratorContext
  ): Promise<void> {
    try {
      const template = await fs.readFile(path.join(tplDir, tplName), 'utf-8')
      const content = this.templateManager.render(template, context)
      await this.writeFile(context.targetDir, targetName, content)
    } catch (e) {
      this.log(`⚠️ Failed to generate ${targetName}: ${e}`)
    }
  }

  protected async generateSkills(context: GeneratorContext): Promise<void> {
    const skillsDir = path.resolve(this.config.templatesDir, 'skills')
    const created = await this.templateManager.applyOverlay(
      skillsDir,
      path.join(context.targetDir, '.skills'),
      context,
      this.fileMerger,
      (msg) => this.log(msg)
    )
    this.filesCreated.push(...created)
  }

  protected async applyOverlays(context: GeneratorContext): Promise<void> {
    const profile = context.profile as string
    if (profile) {
      const overlayDir = path.resolve(this.config.templatesDir, 'overlays', profile)
      await this.copyOverlayDirectory(overlayDir, context)
    }
  }

  protected async applyFeatureOverlays(context: GeneratorContext): Promise<void> {
    const features = (context.features as string[]) || []
    for (const feature of features) {
      const overlayDir = path.resolve(this.config.templatesDir, 'features', feature)
      await this.copyOverlayDirectory(overlayDir, context)
    }
  }

  protected async copyOverlayDirectory(
    sourceDir: string,
    context: GeneratorContext
  ): Promise<void> {
    const created = await this.templateManager.applyOverlay(
      sourceDir,
      context.targetDir,
      context,
      this.fileMerger,
      (msg) => this.log(msg)
    )
    this.filesCreated.push(...created)
  }

  protected async writeFile(
    basePath: string,
    relativePath: string,
    content: string
  ): Promise<void> {
    const writtenPath = await FileUtilities.writeFile(
      basePath,
      relativePath,
      content,
      this.fileMerger,
      (msg) => this.log(msg)
    )
    this.filesCreated.push(writtenPath)
  }

  protected generatePackageJson(context: GeneratorContext): string {
    const profile = (context.profile as string) || 'core'
    const deps: Record<string, string> = {
      '@gravito/core': '^1.0.0-beta.5',
      '@gravito/atlas': '^1.0.0-beta.5',
      '@gravito/plasma': '^1.0.0-beta.5',
      '@gravito/stream': '^1.0.0-beta.5',
    }
    if (profile === 'enterprise' || profile === 'scale') {
      deps['@gravito/quasar'] = '^1.0.0-beta.5'
      deps['@gravito/horizon'] = '^1.0.0-beta.5'
    }
    if (context.withSpectrum) {
      deps['@gravito/spectrum'] = '^1.0.0-beta.5'
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
        typecheck: 'bun tsc --noEmit',
        validate: 'bun run typecheck && bun run test',
      },
      dependencies: deps,
      devDependencies: { 'bun-types': 'latest', typescript: '^5.9.3' },
    }
    return JSON.stringify(pkg, null, 2)
  }

  protected abstract generateArchitectureDoc(context: GeneratorContext): string

  protected async generateCheckScripts(context: GeneratorContext): Promise<void> {
    const scriptsDir = path.resolve(context.targetDir, 'scripts')
    await fs.mkdir(scriptsDir, { recursive: true })
    const templatesDir = path.resolve(this.config.templatesDir, 'scripts')

    await this.generateFileFromTemplate(
      templatesDir,
      'check-dependencies.ts.hbs',
      'scripts/check-dependencies.ts',
      context
    )
    await this.generateFileFromTemplate(templatesDir, 'check.sh.hbs', 'scripts/check.sh', context)
    await this.generateFileFromTemplate(
      templatesDir,
      'pre-commit.sh.hbs',
      'scripts/pre-commit.sh',
      context
    )

    await this.writeFile(
      context.targetDir,
      'CHECK_SYSTEM.md',
      '# Project Check System\n\nRun `bun run validate` to check everything.\n'
    )
  }

  protected log(message: string): void {
    if (this.config.verbose) {
      console.log(message)
    }
  }

  static createContext(
    name: string,
    targetDir: string,
    architecture: ArchitectureType,
    packageManager: 'bun' | 'npm' | 'yarn' | 'pnpm' = 'bun',
    extra: Record<string, unknown> = {}
  ): GeneratorContext {
    const toPascalCase = (str: string) =>
      str
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .split(/[-_ ]+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('')

    const toCamelCase = (str: string) => {
      const pascal = toPascalCase(str)
      return pascal.charAt(0).toLowerCase() + pascal.slice(1)
    }

    const toSnakeCase = (str: string) =>
      str
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .split(/[-_ ]+/)
        .map((word) => word.toLowerCase())
        .join('_')

    const toKebabCase = (str: string) =>
      str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .split(/[-_ ]+/)
        .map((word) => word.toLowerCase())
        .join('-')

    return {
      name,
      namePascalCase: toPascalCase(name),
      nameCamelCase: toCamelCase(name),
      nameSnakeCase: toSnakeCase(name),
      nameKebabCase: toKebabCase(name),
      targetDir,
      architecture,
      packageManager,
      year: new Date().getFullYear().toString(),
      date: new Date().toISOString().split('T')[0]!,
      ...extra,
    }
  }
}
