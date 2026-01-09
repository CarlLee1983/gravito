import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const baseCwd = process.cwd()
const envPath = join(baseCwd, '.env')
const envExamplePath = join(baseCwd, '.env.example')

if (!existsSync(envPath) && existsSync(envExamplePath)) {
  copyFileSync(envExamplePath, envPath)
}

const steps: Array<{ name: string; cmd: [string, ...string[]]; cwd?: string }> = [
  { name: 'Install dependencies', cmd: ['bun', 'install', '--frozen-lockfile'] },
  {
    name: 'Build Gravito CLI',
    cmd: ['bun', 'run', 'build'],
    cwd: join('..', '..', 'packages', 'cli'),
  },
  {
    name: 'Run migrations',
    cmd: ['bun', join('..', '..', 'packages', 'cli', 'dist', 'index.js'), 'db:migrate', '--fresh'],
  },
  {
    name: 'Run Gravito Doctor',
    cmd: ['bun', join('..', '..', 'packages', 'cli', 'dist', 'index.js'), 'doctor'],
  },
  { name: 'Run tests', cmd: ['bun', 'test'] },
]

for (const step of steps) {
  console.log(`\n> ${step.name}`)
  const result = spawnSync(step.cmd[0], step.cmd.slice(1), {
    stdio: 'inherit',
    cwd: step.cwd ? join(baseCwd, step.cwd) : baseCwd,
  })
  if (result.status !== 0) {
    console.error(`Step failed: ${step.name}`)
    process.exit(result.status ?? 1)
  }
}
