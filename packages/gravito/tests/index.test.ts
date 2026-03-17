import { describe, expect, it } from 'bun:test'

import pkg from '../package.json'

describe('gravito wrapper package', () => {
  it('exports the CLI binary and delegates to @gravito/pulse', () => {
    expect(pkg.bin.gravito).toBe('bin/gravito.js')
    expect(pkg.exports['.']).toBe('./bin/gravito.js')
    expect(pkg.dependencies['@gravito/pulse']).toBeDefined()
  })
})
