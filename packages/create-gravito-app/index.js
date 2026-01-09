#!/usr/bin/env bun
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/**
 * This is a thin wrapper around @gravito/cli to support 'bun create gravito-app'
 */

export async function run(options = {}) {
    const {
        argv = process.argv.slice(2),
        resolve = require.resolve,
        spawnFn = spawn,
        exit = process.exit,
        env = process.env
    } = options

    // Find the @gravito/cli binary
    // When installed, it should be in the dependencies
    try {
        const cliPath = resolve('@gravito/cli/bin/gravito.mjs')

        // Execute the CLI create command
        const child = spawnFn('bun', [cliPath, 'create', ...argv], {
            stdio: 'inherit',
            env
        })

        child.on('exit', (code) => {
            exit(code ?? 0)
        })
        return child
    } catch (err) {
        console.error('❌ Failed to locate @gravito/cli. Please try again.')
        exit(1)
        return null
    }
}

if (import.meta.main) {
    run()
}
