import { GeneratorBase, type GeneratorOptions } from './GeneratorBase'

export class ControllerGenerator extends GeneratorBase {
  async run(name: string, options: GeneratorOptions): Promise<void> {
    const className = this.toPascalCase(name)
    const targetDir = this.getTargetDir('controller')
    const filename = `${className}Controller.ts`

    const content = this.generateControllerContent(className, options.resource)
    await this.generateFile(targetDir, filename, content)

    console.log(`✅ Controller created: ${targetDir}/${filename}`)
  }

  private generateControllerContent(className: string, isResource: boolean): string {
    if (isResource) {
      return this.generateResourceController(className)
    }
    return this.generateBasicController(className)
  }

  private generateResourceController(className: string): string {
    return `import { GravitoContext } from '@gravito/core'

export class ${className}Controller {
  async index(ctx: GravitoContext) {
    // List all resources
    return ctx.json({ data: [] })
  }

  async show(ctx: GravitoContext) {
    const id = ctx.request.params.id
    // Get single resource
    return ctx.json({ data: { id } })
  }

  async create(ctx: GravitoContext) {
    // Show create form
    return ctx.view.render('${this.toKebabCase(className)}/create')
  }

  async store(ctx: GravitoContext) {
    // Store new resource
    return ctx.json({ message: 'Resource created' })
  }

  async edit(ctx: GravitoContext) {
    const id = ctx.request.params.id
    // Show edit form
    return ctx.view.render('${this.toKebabCase(className)}/edit', { id })
  }

  async update(ctx: GravitoContext) {
    const id = ctx.request.params.id
    // Update resource
    return ctx.json({ message: 'Resource updated' })
  }

  async destroy(ctx: GravitoContext) {
    const id = ctx.request.params.id
    // Delete resource
    return ctx.json({ message: 'Resource deleted' })
  }
}
`
  }

  private generateBasicController(className: string): string {
    return `import { GravitoContext } from '@gravito/core'

export class ${className}Controller {
  async handle(ctx: GravitoContext) {
    return ctx.json({ message: '${className}' })
  }
}
`
  }

  private toPascalCase(str: string): string {
    return str
      .split(/[-_]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
  }

  private toKebabCase(str: string): string {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')
  }
}
