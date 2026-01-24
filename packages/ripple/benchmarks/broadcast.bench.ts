import type { ServerWebSocket } from 'bun'
import { Bench } from 'tinybench'
import { MessageSerializer } from '../src/utils/MessageSerializer'

const bench = new Bench({ time: 200 })

function createMockWebSocket(): ServerWebSocket<unknown> {
  return {
    send: (_data: string) => {},
    close: () => {},
    data: {},
    readyState: 1,
    remoteAddress: '127.0.0.1',
  } as ServerWebSocket<unknown>
}

const testMessage = {
  type: 'event' as const,
  channel: 'test-channel',
  event: 'TestEvent',
  data: { foo: 'bar', count: 123 },
}

function simulateBroadcastWithoutCache(clientCount: number) {
  const clients: ServerWebSocket<unknown>[] = []
  for (let i = 0; i < clientCount; i++) {
    clients.push(createMockWebSocket())
  }

  for (const ws of clients) {
    const serialized = JSON.stringify(testMessage)
    ws.send(serialized)
  }
}

function simulateBroadcastWithCache(clientCount: number) {
  const serializer = new MessageSerializer()
  const clients: ServerWebSocket<unknown>[] = []
  for (let i = 0; i < clientCount; i++) {
    clients.push(createMockWebSocket())
  }

  const serialized = serializer.serializeForBroadcast(testMessage)
  for (const ws of clients) {
    ws.send(serialized)
  }
  serializer.clearBroadcastCache()
}

bench.add('Broadcast to 10 clients (without cache)', () => {
  simulateBroadcastWithoutCache(10)
})

bench.add('Broadcast to 10 clients (with cache)', () => {
  simulateBroadcastWithCache(10)
})

bench.add('Broadcast to 100 clients (without cache)', () => {
  simulateBroadcastWithoutCache(100)
})

bench.add('Broadcast to 100 clients (with cache)', () => {
  simulateBroadcastWithCache(100)
})

await bench.run()

console.log('\n📊 Broadcast Performance Benchmarks\n')
console.table(bench.table())

console.log('\n🎯 Performance Improvement Analysis:')

function calculateImprovement(withoutCache: number, withCache: number) {
  return (((withCache - withoutCache) / withoutCache) * 100).toFixed(2)
}

const results = bench.tasks.map((t) => t.result)

if (results.every((r) => r && 'latency' in r && r.latency && 'mean' in r.latency)) {
  const getMean = (r: any) => r.latency.mean

  const without10 = 1000000 / getMean(results[0])
  const with10 = 1000000 / getMean(results[1])
  const without100 = 1000000 / getMean(results[2])
  const with100 = 1000000 / getMean(results[3])

  console.log(`10 clients:   ${calculateImprovement(without10, with10)}% faster with cache`)
  console.log(`100 clients:  ${calculateImprovement(without100, with100)}% faster with cache`)
  console.log('\n✅ With serialization caching: O(1) serialization instead of O(N)')
} else {
  console.log('⚠️  Results not available for performance analysis')
}
