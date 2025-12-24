import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Command } from './Command'
import { MakeMigrationCommand } from './MakeMigrationCommand'

export class MakeModelCommand extends Command {
  signature = 'make:model <name>'
  description = 'Create a new Eloquent model class'

  async handle(args: Record<string, any>): Promise<void> {
    const name = args.name
    const path = args.path || 'src/models'
    
    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true })
    }

    const content = `import { Model, column } from '@gravito/atlas'

export default class ${name} extends Model {
  static tableName = '${name.toLowerCase()}s'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare created_at: Date

  @column()
  declare updated_at: Date
}
`
    const filePath = join(path, `${name}.ts`)
    if (existsSync(filePath)) {
        console.error(`Model ${name} already exists at ${filePath}`)
        return
    }

    writeFileSync(filePath, content)
    console.log(`Model ${name} created successfully at ${filePath}`)

    // Handle --migration flag
    if (args.migration) {
        console.log(`Generating migration for ${name}...`)
        await new MakeMigrationCommand().handle({ 
            name: `create_${name.toLowerCase()}s_table`,
            path: args.migrationPath // Optional custom path
        })
    }
  }
}

