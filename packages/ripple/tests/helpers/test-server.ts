import { RippleServer } from '../../src/RippleServer'
import type { RippleConfig } from '../../src/types'

export interface TestServerSetup {
  server: RippleServer
  port: number
}

export async function createTestServer(config?: RippleConfig): Promise<TestServerSetup> {
  const server = new RippleServer({ ...config, port: config?.port || 0 })
  await server.init()

  return {
    server,
    port: config?.port || 0,
  }
}

export async function cleanupTestServer(setup: TestServerSetup): Promise<void> {
  await setup.server.shutdown()
}
