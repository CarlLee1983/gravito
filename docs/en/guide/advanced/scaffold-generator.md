---
title: Scaffold Generator
description: Project scaffolding for MVC, DDD, and Clean Architecture.
---

# Scaffold Generator

Scaffold is Gravito's project generator with templates for MVC, DDD, and Clean Architecture.

## Highlights

- Multiple architecture templates (MVC / DDD / Clean)
- CLI and programmatic API
- Extensible custom generators
- Built-in template engine and helpers

## Installation

```bash
bun add @gravito/scaffold
```

## CLI Usage

```bash
npx gravito init my-app --architecture ddd
```

## Common Options

```bash
npx gravito init my-app \
  --architecture clean \
  --package-manager bun \
  --skip-install \
  --skip-git
```

## Architecture Templates

| Type | Description |
| --- | --- |
| `enterprise-mvc` | Laravel-style MVC |
| `clean` | Strict layered Clean Architecture |
| `ddd` | Domain-Driven Design (bounded contexts) |

## Output Example

```
my-app/
  src/
  tests/
  .env
  package.json
  README.md
```

## Programmatic API

```ts
import { Scaffold } from '@gravito/scaffold'

const scaffold = new Scaffold({
  name: 'my-app',
  architecture: 'ddd',
  targetPath: './my-app',
  packageManager: 'bun',
})

await scaffold.generate()
```

## Template Engine & Helpers

Scaffold includes Handlebars-style templates and string helpers:

- `pascalCase` / `camelCase` / `kebabCase`
- `snakeCase` / `upperCase` / `lowerCase`
- `pluralize` / `singularize`

```ts
import { StubGenerator } from '@gravito/scaffold'

const generator = new StubGenerator()
generator.registerHelper('uppercase', (str) => str.toUpperCase())
const result = generator.render('Hello {{uppercase name}}!', { name: 'world' })
```

## Custom Generators

```ts
import { BaseGenerator, type GeneratorContext, type DirectoryNode } from '@gravito/scaffold'

export class MyCustomGenerator extends BaseGenerator {
  getDirectoryStructure(context: GeneratorContext): DirectoryNode[] {
    return [
      {
        type: 'directory',
        name: 'src',
        children: [{ type: 'file', name: 'index.ts', content: 'console.log(\"Hello\")' }],
      },
    ]
  }
}
```

## Next Steps

- CLI flow: [Project Init](./cli-init.md)
