# @gravito/nova

Bun Shell Orchestration Engine for Gravito - Type-safe, shell-injection-resistant shell command execution.

## Features

- **Template Literal API**: Type-safe shell commands with automatic argument escaping
- **Shell Injection Protection**: All interpolated values are automatically escaped
- **Pipeline Support**: Compose multiple commands with pipe operations
- **PlanetCore Integration**: Seamless integration with Gravito's lifecycle management
- **No Dependencies**: Pure Bun + TypeScript, zero external dependencies
- **Full TypeScript Support**: 100% type coverage with strict mode

## Installation

```bash
bun add @gravito/nova
```

## Quick Start

### Standalone Usage

```typescript
import { Shell } from '@gravito/nova'

// Simple command execution
const result = await Shell.run`echo hello`
console.log(result.stdout) // "hello"

// Get text output directly
const text = await Shell.text`npm whoami`

// Parse JSON output
const data = await Shell.json`curl https://api.example.com/data`

// Array of lines
const lines = await Shell.run`ls -la ${directory}`.lines()
```

### With PlanetCore

```typescript
import { OrbitNova, Shell } from '@gravito/nova'
import { PlanetCore } from '@gravito/core'

const core = new PlanetCore()
core.addOrbit(new OrbitNova({ exposeAs: 'shell' }))

// In controllers
async handle(ctx: GravitoContext) {
  const result = await ctx.get('shell').run`ls -la`
}
```

## API

### Shell

Static facade for shell command execution.

#### `Shell.run(strings, ...values): ShellCommand`

Execute a shell command with template literal syntax.

```typescript
const result = await Shell.run`echo ${message}`
```

#### `Shell.text(strings, ...values): Promise<string>`

Execute a command and get stdout as string.

```typescript
const output = await Shell.text`cat ${file}`
```

#### `Shell.json<T>(strings, ...values): Promise<T>`

Execute a command and parse stdout as JSON.

```typescript
const data = await Shell.json`curl ${url}`
```

#### `Shell.cmd(strings, ...values): ShellCommand`

Create a command for use in pipelines.

```typescript
const result = await Shell.pipe(
  Shell.cmd`cat ${file}`,
  Shell.cmd`grep ${pattern}`,
  Shell.cmd`head -n ${count}`
).text()
```

#### `Shell.pipe(...commands): Pipeline`

Create a pipeline from multiple commands.

```typescript
const output = await Shell.pipe(
  Shell.cmd`cat input.txt`,
  Shell.cmd`sort`,
  Shell.cmd`uniq`
).run()
```

### ShellCommand

Chainable command builder.

#### Configuration Methods

```typescript
Shell.run`echo test`
  .cwd('/path/to/dir')        // Set working directory
  .env({ VAR: 'value' })      // Set environment variables
  .quiet()                     // Suppress output
  .nothrow()                   // Don't throw on error
  .timeout(5000)               // Set timeout in ms
  .run()                       // Execute
```

#### Execution Methods

```typescript
const cmd = Shell.run`echo hello`

await cmd.run()               // Get ShellResult
await cmd.text()              // Get stdout as string
await cmd.lines()             // Get stdout as string[]
await cmd.json<T>()           // Parse stdout as JSON
```

### ShellResult

```typescript
interface ShellResult {
  exitCode: number       // Process exit code
  stdout: string         // Standard output
  stderr: string         // Standard error
  success: boolean       // Whether exitCode === 0
}
```

### Errors

```typescript
import { NovaError, NovaShellError } from '@gravito/nova'

try {
  await Shell.run`false`
} catch (error) {
  if (error instanceof NovaShellError) {
    console.log(error.exitCode)
    console.log(error.stdout)
    console.log(error.stderr)
  }
}
```

## Shell Injection Protection

All interpolated values are automatically escaped:

```typescript
// Safe - even with malicious input
const userInput = '$(rm -rf /)'
await Shell.run`echo ${userInput}` // Outputs literal string, not executed
```

## Examples

### File Operations

```typescript
// Check if file exists
const result = await Shell.run`test -f ${filepath}`.nothrow()
const exists = result.success

// Count lines in file
const lineCount = await Shell.text`wc -l < ${filepath}`

// Find files
const files = await Shell.run`find ${dir} -name ${pattern}`.lines()
```

### Process Management

```typescript
// Get process info
const ps = await Shell.text`ps aux | grep ${processName}`

// Kill process
await Shell.run`kill ${pid}`.nothrow()
```

### Git Operations

```typescript
// Get current branch
const branch = await Shell.text`git branch --show-current`

// Get commit log
const commits = await Shell.run`git log --oneline -n ${count}`.lines()
```

### NPM/Package Management

```typescript
// Install dependencies
await Shell.run`npm install`

// Run script
const output = await Shell.text`npm run ${scriptName}`
```

## Error Handling

By default, non-zero exit codes throw errors:

```typescript
try {
  await Shell.run`command that fails`
} catch (error) {
  // Handle error
}
```

Suppress errors with `.nothrow()`:

```typescript
const result = await Shell.run`command that fails`.nothrow()
if (!result.success) {
  console.log(`Exit code: ${result.exitCode}`)
}
```

## Performance

- **No dependencies**: Pure Bun implementation
- **Minimal overhead**: Direct Bun.spawn() usage
- **Memory efficient**: Streams-based output handling
- **Type safe**: Full TypeScript support with strict mode

## Testing

```bash
# Run tests
bun test

# With coverage
bun test --coverage

# Type checking
bun run typecheck
```

## License

MIT

## Related Packages

- [@gravito/core](../core) - PlanetCore framework
- [@gravito/photon](../photon) - HTTP engine
- [@gravito/atlas](../atlas) - ORM

## Support

For issues and discussions, visit [GitHub Issues](https://github.com/gravito-framework/gravito/issues)
