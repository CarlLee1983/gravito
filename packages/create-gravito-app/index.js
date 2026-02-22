#!/usr/bin/env bun
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/**
 * Main entry point for the 'create-gravito-app' initializer.
 * Orchestrates the project bootstrapping by delegating to the '@gravito/cli' create command.
 *
 * @param {Object} [options] - Execution options for the runner.
 * @param {string[]} [options.argv] - Command line arguments passed to the CLI.
 * @param {Function} [options.resolve] - Dependency resolver function.
 * @param {Function} [options.spawnFn] - Process spawn function.
 * @param {Function} [options.exit] - Process exit function.
 * @param {Object} [options.env] - Environment variables.
 * @returns {Promise<import('node:child_process').ChildProcess | null>} The spawned CLI process.
 * @public
 */
export async function run(options = {}) {
  const {
    argv = process.argv.slice(2),
    resolve = require.resolve,
    spawnFn = spawn,
    exit = process.exit,
    env = process.env,
  } = options

  // Find the @gravito/pulse binary
  // When installed, it should be in the dependencies
  try {
    const cliPath = resolve('@gravito/pulse/bin/gravito.mjs')

    // Execute the CLI create command
    const child = spawnFn('bun', [cliPath, 'create', ...argv], {
      stdio: 'inherit',
      env,
    })

    child.on('exit', (code) => {
      exit(code ?? 0)
    })
    return child
  } catch (err) {
    console.error('❌ Failed to locate @gravito/pulse. Please try again.')
    exit(1)
    return null
  }
}

if (import.meta.main) {
  run()
}
