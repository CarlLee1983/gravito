import { describe, expect, it, spyOn } from 'bun:test'
import { run } from '../index.js'

describe('create-gravito-app', () => {
  it('spawns the CLI create command with forwarded args', async () => {
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
    const exit = (code: number) => {
      exitCode = code
    }
    const resolve = (id: string) => {
      expect(id).toBe('@gravito/pulse/bin/gravito.mjs')
      return '/tmp/gravito-cli.mjs'
    }

    await run({
      argv: ['my-app', '--template', 'basic'],
      command: '/tmp/bun',
      resolve,
      spawnFn,
      exit,
      env: { TEST_ENV: '1' },
    })

    expect(calls).toHaveLength(1)
    expect(calls[0].cmd).toBe('/tmp/bun')
    expect(calls[0].args).toEqual([
      '/tmp/gravito-cli.mjs',
      'create',
      'my-app',
      '--template',
      'basic',
    ])
    expect(calls[0].opts).toEqual({ stdio: 'inherit', env: { TEST_ENV: '1' } })
    expect(exitCode).toBe(0)
  })

  it('exits with error when spawning the CLI fails', async () => {
    const errorSpy = spyOn(console, 'error').mockImplementation(() => {})
    let exitCode: number | undefined
    const exit = (code: number) => {
      exitCode = code
    }

    await run({
      resolve: () => '/tmp/gravito-cli.mjs',
      spawnFn: () => ({
        on: (event: string, cb: (value?: unknown) => void) => {
          if (event === 'error') {
            cb(new Error('spawn failed'))
          }
        },
      }),
      exit,
    })

    expect(exitCode).toBe(1)
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('exits with error when the CLI cannot be resolved', async () => {
    const errorSpy = spyOn(console, 'error').mockImplementation(() => {})
    let exitCode: number | undefined
    const exit = (code: number) => {
      exitCode = code
    }

    await run({
      resolve: () => {
        throw new Error('missing')
      },
      spawnFn: () => {
        throw new Error('spawn should not be called')
      },
      exit,
    })

    expect(exitCode).toBe(1)
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})
