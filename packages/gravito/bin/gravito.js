#!/usr/bin/env bun
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * Delegate the published gravito binary to @gravito/pulse.
 *
 * @param {object} [options]
 * @param {string[]} [options.argv]
 * @param {(id: string) => string} [options.resolve]
 * @param {typeof spawn} [options.spawnFn]
 * @param {string} [options.command]
 * @param {(code: number) => void} [options.exit]
 * @param {NodeJS.ProcessEnv} [options.env]
 * @returns {Promise<import('node:child_process').ChildProcess | null>}
 */
export async function run(options = {}) {
  const {
    argv = process.argv.slice(2),
    resolve = require.resolve,
    spawnFn = spawn,
    command = process.execPath,
    exit = process.exit,
    env = process.env,
  } = options;

  try {
    const cliPath = resolve('@gravito/pulse/bin/gravito.mjs');
    const child = spawnFn(command, [cliPath, ...argv], {
      stdio: 'inherit',
      env,
    });
    child.on('exit', (code) => {
      exit(code ?? 0);
    });
    child.on('error', (error) => {
      console.error(
        `❌ Failed to start @gravito/pulse: ${error instanceof Error ? error.message : String(error)}`
      );
      exit(1);
    });
    return child;
  } catch (err) {
    console.error('❌ Failed to locate @gravito/pulse. Please try again.');
    exit(1);
    return null;
  }
}

if (import.meta.main) {
  run();
}
