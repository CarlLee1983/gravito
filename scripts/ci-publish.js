#!/usr/bin/env node
const { spawn } = require('node:child_process')

const args = process.argv.slice(2)
const child = spawn('bun', ['run', 'changeset', 'publish', ...args], {
  stdio: ['inherit', 'pipe', 'pipe'],
})

let stdout = ''
let stderr = ''

child.stdout.on('data', (chunk) => {
  process.stdout.write(chunk)
  stdout += chunk?.toString() ?? ''
})

child.stderr.on('data', (chunk) => {
  process.stderr.write(chunk)
  stderr += chunk?.toString() ?? ''
})

child.on('error', (error) => {
  console.error('Failed to run changeset publish:', error)
  process.exit(1)
})

child.on('close', (code) => {
  const exitCode = code ?? 1
  if (exitCode === 0) {
    process.exit(0)
  }

  const output = `${stdout}${stderr}`
  const isRegistryError =
    /E404 Not Found/.test(output) ||
    /Access token expired/.test(output) ||
    /not in this registry/i.test(output)

  if (isRegistryError) {
    console.warn(
      'Skipping publish because npm registry rejected the request (token missing/expired).'
    )
    process.exit(0)
  }

  process.exit(exitCode)
})
