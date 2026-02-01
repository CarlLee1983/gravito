import { describe, expect, it, mock, spyOn } from 'bun:test'
import { RedisClusterClient } from '../src/RedisClusterClient'
import { RedisManager } from '../src/RedisManager'

// Mock ioredis
const mockCluster = {
  connect: mock(async () => {}),
  quit: mock(async () => 'OK'),
  disconnect: mock(() => {}),
  ping: mock(async () => 'PONG'),
  on: mock((event: string, cb: any) => {}),
  // Add other methods as needed
  get: mock(async () => 'value'),
  set: mock(async () => 'OK'),
  call: mock(async () => 'OK'),
}

// Mock the ioredis module
mock.module('ioredis', () => {
  return {
    Cluster: class {
      constructor(nodes: any[], options: any) {
        // biome-ignore lint/correctness/noConstructorReturn: Mock
        return mockCluster
      }
    },
    default: class {},
  }
})

describe('RedisClusterClient', () => {
  it('should instantiate Cluster when config has nodes', async () => {
    const manager = new RedisManager()
    manager.configure({
      connections: {
        cluster: {
          cluster: {
            nodes: [
              { host: 'node1', port: 7000 },
              { host: 'node2', port: 7001 },
            ],
          },
        },
      },
    })

    const client = manager.connection('cluster')
    expect(client).toBeInstanceOf(RedisClusterClient)

    // Test connection
    await client.connect()
    expect(mockCluster.on).toHaveBeenCalled() // Should register events

    // Test command
    await client.set('key', 'val')
    expect(mockCluster.call).toHaveBeenCalled()

    await client.disconnect()

    expect(mockCluster.quit).toHaveBeenCalled()
  })

  it('should instantiate Cluster when config has cluster enable=true', async () => {
    const manager = new RedisManager()
    manager.configure({
      connections: {
        cluster: {
          host: 'seed-node',
          port: 7000,
          cluster: {
            enable: true,
          },
        },
      },
    })

    const client = manager.connection('cluster')
    expect(client).toBeInstanceOf(RedisClusterClient)
  })
})
