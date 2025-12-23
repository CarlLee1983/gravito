import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import pc from 'picocolors'

export class MakeCommand {
  private stubsPath: string

  /**
   * Create a new MakeCommand instance.
   *
   * Resolves the path to the stubs directory.
   */
  constructor() {
    // Resolve stubs relative to the compiled CLI executable or source
    // In dev: src/commands/MakeCommand.ts -> ../../stubs
    // In prod: dist/index.js -> ../stubs
    const devPath = path.resolve(__dirname, '../../stubs')
    const prodPath = path.resolve(__dirname, '../stubs')
    this.stubsPath = existsSync(prodPath) ? prodPath : devPath
  }

  /**
   * Run the generator.
   *
   * @param type - The type of artifact to create (e.g., 'controller', 'model').
   * @param name - The user-provided name for the artifact.
   * @returns A promise that resolves when the file is created.
   */
  async run(type: string, name: string) {
    try {
      const stubName = `${type}.stub`
      const stubContent = await this.readStub(stubName)

      if (!stubContent) {
        throw new Error(`Stub not found: ${stubName}`)
      }

      const normalizedName = this.normalizeName(type, name)
      const content = this.replaceVariables(
        stubContent,
        normalizedName.pascal,
        normalizedName.camel
      )
      const targetPath = this.resolveTargetPath(type, normalizedName)

      await this.ensureDirectory(path.dirname(targetPath))
      await this.writeFile(targetPath, content)

      console.log(pc.green(`✅ Created ${type}: ${this.getRelativePath(targetPath)}`))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(pc.red(`❌ Failed to create ${type}: ${message}`))
      process.exit(1)
    }
  }

  /**
   * Read a stub file.
   *
   * @param filename - The name of the stub file.
   * @returns The content of the stub file, or null if not found.
   */
  private async readStub(filename: string): Promise<string | null> {
    try {
      const filePath = path.join(this.stubsPath, filename)
      return await fs.readFile(filePath, 'utf-8')
    } catch (_e) {
      return null
    }
  }

  /**
   * Replace variables in the stub content.
   *
   * @param content - The stub content.
   * @param pascal - The PascalCase name.
   * @param camel - The camelCase name.
   * @returns The processed content with variables replaced.
   */
  private replaceVariables(content: string, pascal: string, camel: string): string {
    return content.replace(/\{\{ Name \}\}/g, pascal).replace(/\{\{ name \}\}/g, camel)
  }

  /**
   * Resolve the target file path based on type and name.
   *
   * @param type - The artifact type.
   * @param name - The normalized name object.
   * @returns The absolute path to the target file.
   * @throws {Error} If the type is unknown.
   */
  private resolveTargetPath(type: string, name: NormalizedName): string {
    const cwd = process.cwd()

    // Define conventions
    const map: Record<string, string> = {
      controller: `src/controllers/${name.pascal}Controller.ts`,
      model: `src/models/${name.pascal}.ts`,
      middleware: `src/middleware/${name.camel}.ts`,
      seeder: `src/database/seeders/${name.pascal}Seeder.ts`,
    }

    if (!map[type]) {
      throw new Error(`Unknown type: ${type}`)
    }

    return path.join(cwd, map[type])
  }

  /**
   * Normalize the input name.
   *
   * @param type - The artifact type.
   * @param rawName - The raw input name.
   * @returns An object containing PascalCase and camelCase versions of the name.
   */
  private normalizeName(type: string, rawName: string): NormalizedName {
    const pascalRaw = this.toPascalCase(rawName)

    const pascal =
      type === 'controller'
        ? this.stripSuffix(pascalRaw, 'Controller')
        : type === 'seeder'
          ? this.stripSuffix(pascalRaw, 'Seeder')
          : pascalRaw

    return {
      pascal,
      camel: this.toCamelCase(pascal),
    }
  }

  private stripSuffix(value: string, suffix: string): string {
    return value.endsWith(suffix) ? value.slice(0, -suffix.length) : value
  }

  private async ensureDirectory(dir: string) {
    await fs.mkdir(dir, { recursive: true })
  }

  private async writeFile(filepath: string, content: string) {
    // Check if exists
    try {
      await fs.access(filepath)
      // If no error, file exists
      throw new Error(`File already exists: ${filepath}`)
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException
      if (error.code !== 'ENOENT') {
        throw err
      }
    }

    await fs.writeFile(filepath, content, 'utf-8')
  }

  private toPascalCase(str: string): string {
    // Remove special chars, split by space/hyphen/underscore
    return str
      .split(/[\s-_]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('')
  }

  private toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str)
    return pascal.charAt(0).toLowerCase() + pascal.slice(1)
  }

  private getRelativePath(fullpath: string): string {
    return path.relative(process.cwd(), fullpath)
  }
}

interface NormalizedName {
  pascal: string
  camel: string
}
