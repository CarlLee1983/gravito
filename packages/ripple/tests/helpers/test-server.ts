import { RippleServer } from '../../src/RippleServer'
import type { RippleBunServer, RippleConfig } from '../../src/types'

export interface TestServerSetup {
  server: RippleServer
  bunServer: RippleBunServer
  port: number
}

export async function createTestServer(config?: RippleConfig): Promise<TestServerSetup> {
  const server = new RippleServer(config)
  await server.init()

  const bunServer = Bun.serve({
    port: 0,
    fetch: (req, srv) => {
      const url = new URL(req.url)
      const userId = url.searchParams.get('userId')

      if (server.upgrade(req, srv, { userId: userId ?? undefined })) return
      return new Response('Not found', { status: 404 })
    },
    websocket: server.getHandler(),
  })

  return {
    server,
    bunServer,
    port: bunServer.port ?? 0,
  }
}

export async function cleanupTestServer(setup: TestServerSetup): Promise<void> {
  setup.bunServer.stop()
  await setup.server.shutdown()
}
