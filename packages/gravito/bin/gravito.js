#!/usr/bin/env bun
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export async function run() {
  const argv = process.argv.slice(2);
  try {
    const cliPath = require.resolve('@gravito/pulse/bin/gravito.mjs');
    const child = spawn('bun', [cliPath, ...argv], {
      stdio: 'inherit',
      env: process.env,
    });
    child.on('exit', (code) => {
      process.exit(code ?? 0);
    });
  } catch (err) {
    console.error('❌ Failed to locate @gravito/pulse. Please try again.');
    process.exit(1);
  }
}

run();
