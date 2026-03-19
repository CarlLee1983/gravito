import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import type { GenerationResult, ModuleGenerationContext } from './ModuleGeneratorTypes'

interface GeneratedFile {
  path: string
  content: string
}

export class ModuleGenerator {
  async generate(context: ModuleGenerationContext): Promise<GenerationResult> {
    const validationError = this.validateContext(context)
    if (validationError) {
      return {
        success: false,
        modulePath: context.targetDir,
        filesCreated: [],
        errors: [validationError],
      }
    }

    if (await this.pathExists(context.targetDir)) {
      return {
        success: false,
        modulePath: context.targetDir,
        filesCreated: [],
        errors: [`Module already exists: ${context.targetDir}`],
      }
    }

    const files = this.buildFiles(context)

    await fs.mkdir(context.targetDir, { recursive: true })

    for (const file of files) {
      await fs.mkdir(path.dirname(file.path), { recursive: true })
      await fs.writeFile(file.path, file.content, 'utf8')
    }

    return {
      success: true,
      modulePath: context.targetDir,
      filesCreated: files.map((file) => file.path),
    }
  }

  private validateContext(context: ModuleGenerationContext): string | null {
    if (!context.projectRoot) {
      return 'projectRoot is required'
    }

    if (!context.moduleName) {
      return 'moduleName is required'
    }

    if (!context.moduleNameKebabCase) {
      return 'moduleNameKebabCase is required'
    }

    if (!context.targetDir) {
      return 'targetDir is required'
    }

    return null
  }

  private async pathExists(targetPath: string): Promise<boolean> {
    try {
      await fs.access(targetPath)
      return true
    } catch {
      return false
    }
  }

  private buildFiles(context: ModuleGenerationContext): GeneratedFile[] {
    const name = context.moduleName
    const kebab = context.moduleNameKebabCase
    const base = context.targetDir
    const files: GeneratedFile[] = [
      {
        path: path.join(base, 'Domain', 'Entities', `${name}.ts`),
        content: `import { AggregateRoot } from '@gravito/enterprise'\n\nexport class ${name} extends AggregateRoot<string> {}\n`,
      },
      {
        path: path.join(base, 'Domain', 'ValueObjects', `${name}ValueObject.ts`),
        content: `export class ${name}ValueObject {\n  constructor(public readonly value: string) {}\n}\n`,
      },
      {
        path: path.join(base, 'Domain', 'Repositories', `I${name}Repository.ts`),
        content: `export interface I${name}Repository {\n  findById(id: string): Promise<${name} | null>\n}\n`,
      },
      {
        path: path.join(base, 'Application', 'Services', `${name}Service.ts`),
        content: `export class ${name}Service {\n  async execute(): Promise<void> {}\n}\n`,
      },
      {
        path: path.join(base, 'Application', 'DTOs', `${name}DTO.ts`),
        content: `export interface ${name}DTO {\n  id: string\n}\n`,
      },
      {
        path: path.join(base, 'Presentation', 'Controllers', `${name}Controller.ts`),
        content: `export class ${name}Controller {\n  index() {\n    return '${name}'\n  }\n}\n`,
      },
      {
        path: path.join(base, 'Presentation', 'Routes', `${kebab}.routes.ts`),
        content: `export function register(routes: unknown) {\n  return routes\n}\n`,
      },
      {
        path: path.join(base, 'Infrastructure', 'Repositories', `${name}Repository.ts`),
        content: `import type { I${name}Repository } from '../../Domain/Repositories/I${name}Repository'\n\nexport class ${name}Repository implements I${name}Repository {\n  async findById(): Promise<null> {\n    return null\n  }\n}\n`,
      },
      {
        path: path.join(base, 'index.ts'),
        content: `export * from './Domain/Entities/${name}'\nexport * from './Application/Services/${name}Service'\n`,
      },
    ]

    if (context.dddType !== 'simple') {
      files.push({
        path: path.join(base, 'Domain', 'Events', `${name}Created.ts`),
        content: `export class ${name}Created {\n  constructor(public readonly id: string) {}\n}\n`,
      })
    }

    if (context.dddType === 'advanced') {
      files.push({
        path: path.join(base, 'Domain', 'Events', `${name}Updated.ts`),
        content: `export class ${name}Updated {}\n`,
      })
    }

    if (context.dddType === 'cqrs-query') {
      files.push({
        path: path.join(base, 'Domain', 'ReadModels', `${name}ReadModel.ts`),
        content: `export interface ${name}ReadModel {\n  id: string\n}\n`,
      })
    }

    return files
  }
}
