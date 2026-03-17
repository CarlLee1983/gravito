import { afterEach, describe, expect, mock, test } from 'bun:test'
import { TcpClient } from '../src/TcpClient'

describe('TcpClient', () => {
  const originalConnect = Bun.connect

  afterEach(() => {
    ;(Bun as any).connect = originalConnect
    mock.restore()
  })

  test('closes late socket opens after timeout', async () => {
    let handlers:
      | {
          open: (socket: any) => void
          error: (socket: any, error: Error) => void
          close: () => void
        }
      | undefined

    ;(Bun as any).connect = mock((options: any) => {
      handlers = options.socket
      return {}
    })

    const client = new TcpClient({
      host: '127.0.0.1',
      port: 31337,
      timeout: 10,
    })

    await expect(client.connect()).rejects.toThrow('Connection timeout after 10ms')

    const socket = {
      close: mock(() => {}),
    }

    handlers?.open(socket)

    expect(socket.close).toHaveBeenCalledTimes(1)
  })
})
