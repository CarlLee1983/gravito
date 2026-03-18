import { describe, expect, it, spyOn } from 'bun:test'

import { run } from '../bin/gravito.js'
import pkg from '../package.json'

describe('gravito wrapper package', () => {
  it('exports the CLI binary and delegates to @gravito/pulse', () => {
    expect(pkg.bin.gravito).toBe('bin/gravito.js')
    expect(pkg.exports['.']).toBe('./bin/gravito.js')
    expect(pkg.dependencies['@gravito/pulse']).toBeDefined()
  })

  it('spawns the pulse CLI with forwarded args', async () => {
    const calls: Array<{ cmd: string; args: string[]; opts: Record<string, unknown> }> = []
    const spawnFn = (cmd: string, args: string[], opts: Record<string, unknown>) => {
      calls.push({ cmd, args, opts })
      return {
        on: (event: string, cb: (code?: number) => void) => {
          if (event === 'exit') {
            cb(0)
          }
        },
      }
    }
    let exitCode: number | undefined

    await run({
      argv: ['doctor', '--json'],
      resolve: (id) => {
        expect(id).toBe('@gravito/pulse/bin/gravito.mjs')
        return '/tmp/pulse-cli.mjs'
      },
      spawnFn,
      exit: (code) => {
        exitCode = code
      },
      env: { TEST_ENV: '1' },
    })

    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual({
      cmd: 'bun',
      args: ['/tmp/pulse-cli.mjs', 'doctor', '--json'],
      opts: { stdio: 'inherit', env: { TEST_ENV: '1' } },
    })
    expect(exitCode).toBe(0)
  })

  it('exits with error when pulse cannot be resolved', async () => {
    const errorSpy = spyOn(console, 'error').mockImplementation(() => {})
    let exitCode: number | undefined

    await run({
      resolve: () => {
        throw new Error('missing')
      },
      spawnFn: () => {
        throw new Error('spawn should not be called')
      },
      exit: (code) => {
        exitCode = code
      },
    })

    expect(exitCode).toBe(1)
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})
