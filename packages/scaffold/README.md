# @gravito/scaffold

Project scaffolding generators for Gravito Framework.

## Installation

```bash
bun add @gravito/scaffold
```

## Usage

### With CLI (Recommended)

```bash
npx gravito init my-app --architecture ddd
```

### Programmatic API

```typescript
import { Scaffold, type ScaffoldOptions } from '@gravito/scaffold'

const options: ScaffoldOptions = {
  name: 'my-app',
  architecture: 'ddd',
  targetPath: './my-app',
  packageManager: 'bun',
}

const scaffold = new Scaffold(options)
const result = await scaffold.generate()

console.log(`Created ${result.filesCreated} files`)
```

## Architecture Types

| Type | Description |
|------|-------------|
| `enterprise-mvc` | Laravel-inspired MVC structure |
| `clean` | Clean Architecture with strict dependency rules |
| `ddd` | Domain-Driven Design with bounded contexts |

## Generators

### BaseGenerator

Abstract base class for all generators. Provides:
- Directory structure creation
- Package.json generation
- TypeScript configuration
- Environment files
- Architecture documentation

### StubGenerator

Handlebars-based template engine with built-in helpers:

```typescript
import { StubGenerator } from '@gravito/scaffold'

const generator = new StubGenerator()

// Register custom helper
generator.registerHelper('uppercase', (str) => str.toUpperCase())

// Render template
const result = generator.render('Hello {{uppercase name}}!', { name: 'world' })
// => "Hello WORLD!"
```

**Built-in Helpers:**
- `pascalCase` - Convert to PascalCase
- `camelCase` - Convert to camelCase
- `kebabCase` - Convert to kebab-case
- `snakeCase` - Convert to snake_case
- `upperCase` - Convert to UPPERCASE
- `lowerCase` - Convert to lowercase
- `pluralize` - Pluralize word
- `singularize` - Singularize word

## Extending

Create custom generators by extending `BaseGenerator`:

```typescript
import { BaseGenerator, type GeneratorContext, type DirectoryNode } from '@gravito/scaffold'

export class MyCustomGenerator extends BaseGenerator {
  getDirectoryStructure(context: GeneratorContext): DirectoryNode[] {
    return [
      {
        type: 'directory',
        name: 'src',
        children: [
          { type: 'file', name: 'index.ts', content: this.generateIndex(context) },
        ],
      },
    ]
  }

  protected generateArchitectureDoc(context: GeneratorContext): string {
    return `# ${context.name}\n\nMy custom architecture.`
  }

  private generateIndex(context: GeneratorContext): string {
    return `console.log('Hello from ${context.name}!')`
  }
}
```

## API Reference

### ScaffoldOptions

```typescript
interface ScaffoldOptions {
  name: string                    // Project name
  architecture: ArchitectureType  // Architecture pattern
  targetPath: string              // Output directory
  packageManager?: 'bun' | 'npm' | 'pnpm' | 'yarn'
  skipInstall?: boolean
  skipGit?: boolean
}
```

### ScaffoldResult

```typescript
interface ScaffoldResult {
  success: boolean
  projectPath: string
  filesCreated: number
  errors: string[]
}
```

### DirectoryNode

```typescript
interface DirectoryNode {
  type: 'file' | 'directory'
  name: string
  content?: string              // For files
  children?: DirectoryNode[]    // For directories
}
```

## License

MIT
