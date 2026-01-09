import path from 'node:path'
import { getRuntimeAdapter } from '@gravito/core'

export async function tinker() {
  const bootstrapPath = path.resolve(__dirname, '../../stubs/tinker-bootstrap.ts')

  // Need to make sure we're running in a way that can import the project's code.
  // Bun repl with --preload is the key.

  console.log('Loading Tinker environment...')

  const runtime = getRuntimeAdapter()
  const proc = runtime.spawn(['bun', 'repl', '--preload', bootstrapPath], {
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
    env: {
      ...process.env,
      // Force color if needed, though inherit usually works
    },
  })

  await proc.exited
}
