import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Command } from './Command'

export class MakeMigrationCommand extends Command {
  signature = 'make:migration <name>'
  description = 'Create a new migration file'

  async handle(args: Record<string, unknown>): Promise<void> {
    const name = args.name
    const path = args.path || 'database/migrations'

    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true })
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, '')
      .slice(0, 14)
    const fileName = `${timestamp}_${name}.ts`

    const content = `import { Schema } from '@gravito/atlas'

export async function up() {
  await Schema.create('${name}', (table) => {
    table.id()
    table.timestamps()
  })
}

export async function down() {
  await Schema.dropIfExists('${name}')
}
`
    const filePath = join(path, fileName)
    writeFileSync(filePath, content)
    console.log(`Migration created successfully at ${filePath}`)
  }
}
