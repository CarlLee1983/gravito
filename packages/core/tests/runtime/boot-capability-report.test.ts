/**
 * Integration test: PlanetCore.boot() logs native capability report.
 *
 * Verifies that the boot lifecycle emits [gravito] native: log lines
 * before orbits are installed.
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { NativeOrbitDetector } from '../../src/runtime/NativeOrbitDetector'
import { PlanetCore } from '../../src/PlanetCore'

describe('PlanetCore.boot() capability report', () => {
  let logs: string[]

  const testLogger = {
    info: (msg: string) => logs.push(msg),
    warn: (msg: string) => logs.push(msg),
    error: (msg: string) => logs.push(msg),
    debug: (msg: string) => logs.push(msg),
  }

  beforeEach(() => {
    logs = []
    NativeOrbitDetector.reset()
  })

  afterEach(() => {
    NativeOrbitDetector.reset()
  })

  it('should log a line containing [gravito] native: during boot', async () => {
    await PlanetCore.boot({ logger: testLogger })
    const capabilityLine = logs.find((l) => l.includes('[gravito] native:'))
    expect(capabilityLine).toBeDefined()
  })

  it('should include Bun.password argon2id status in capability report', async () => {
    await PlanetCore.boot({ logger: testLogger })
    const capabilityLine = logs.find((l) => l.includes('[gravito] native:'))
    expect(capabilityLine).toContain('Bun.password argon2id')
  })

  it('should include Bun.CryptoHasher status in capability report', async () => {
    await PlanetCore.boot({ logger: testLogger })
    const capabilityLine = logs.find((l) => l.includes('[gravito] native:'))
    expect(capabilityLine).toContain('Bun.CryptoHasher')
  })

  it('should include Bun.Glob status in capability report', async () => {
    await PlanetCore.boot({ logger: testLogger })
    const capabilityLine = logs.find((l) => l.includes('[gravito] native:'))
    expect(capabilityLine).toContain('Bun.Glob')
  })

  it('should log capability report BEFORE orbit installation', async () => {
    const eventLog: string[] = []
    const trackingLogger = {
      info: (msg: string) => eventLog.push(`info:${msg}`),
      warn: (msg: string) => eventLog.push(`warn:${msg}`),
      error: (msg: string) => eventLog.push(`error:${msg}`),
      debug: (msg: string) => eventLog.push(`debug:${msg}`),
    }

    let orbitInstallTime = -1
    let reportLogTime = -1

    const trackingLogger2 = {
      info: (msg: string) => {
        if (msg.includes('[gravito] native:') && reportLogTime === -1) {
          reportLogTime = eventLog.length
        }
        eventLog.push(`info:${msg}`)
      },
      warn: (msg: string) => eventLog.push(`warn:${msg}`),
      error: (msg: string) => eventLog.push(`error:${msg}`),
      debug: (msg: string) => eventLog.push(`debug:${msg}`),
    }

    const testOrbit = {
      install: async (_core: PlanetCore) => {
        orbitInstallTime = eventLog.length
        trackingLogger.info('orbit:installed')
      },
    }

    await PlanetCore.boot({ logger: trackingLogger2, orbits: [testOrbit as unknown as new () => { install: (core: PlanetCore) => Promise<void> }] })

    // capability report should have been logged before orbit install
    expect(reportLogTime).toBeGreaterThanOrEqual(0)
    expect(orbitInstallTime).toBeGreaterThan(reportLogTime)
  })
})
