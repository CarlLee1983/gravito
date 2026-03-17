import { describe, expect, it } from 'bun:test'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from '../build-static'

describe('@gravito/site build-static', () => {
  it('exports a callable build function', () => {
    expect(typeof build).toBe('function')
  })

  it('resolves output relative to the package instead of process cwd', () => {
    const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
    expect(join(packageRoot, 'dist-static')).toContain('/packages/site/dist-static')
  })
})
