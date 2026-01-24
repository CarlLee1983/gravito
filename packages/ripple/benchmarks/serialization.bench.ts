import { Bench } from 'tinybench'
import { MessageSerializer } from '../src/utils/MessageSerializer'

const bench = new Bench({ time: 200 })

const testMessage = {
  type: 'event' as const,
  channel: 'test-channel',
  event: 'TestEvent',
  data: { foo: 'bar', count: 123, nested: { key: 'value' } },
}

// Baseline: Standard JSON.stringify (no caching)
bench.add('Standard JSON.stringify', () => {
  JSON.stringify(testMessage)
})

// Optimized: MessageSerializer with cache
bench.add('MessageSerializer.serialize (no cache)', () => {
  const serializer = new MessageSerializer()
  serializer.serialize(testMessage)
})

// Optimized: MessageSerializer with broadcast cache
bench.add('MessageSerializer.serializeForBroadcast (cached)', () => {
  const serializer = new MessageSerializer()
  serializer.serializeForBroadcast(testMessage)
  serializer.clearBroadcastCache()
})

// Pre-serialized PONG message (best case)
bench.add('MessageSerializer.getPongMessage (pre-serialized)', () => {
  const serializer = new MessageSerializer()
  serializer.getPongMessage()
})

await bench.run()

console.log('\n📊 Serialization Performance Benchmarks\n')
console.table(bench.table())

console.log('\n🎯 Key Metrics:')
const baseline = bench.tasks[0].result
const optimized = bench.tasks[2].result
const precomputed = bench.tasks[3].result

if (
  baseline &&
  optimized &&
  precomputed &&
  'latency' in baseline &&
  baseline.latency &&
  'mean' in baseline.latency &&
  'latency' in optimized &&
  optimized.latency &&
  'mean' in optimized.latency &&
  'latency' in precomputed &&
  precomputed.latency &&
  'mean' in precomputed.latency
) {
  const baselineOps = 1000000 / baseline.latency.mean
  const optimizedOps = 1000000 / optimized.latency.mean
  const precomputedOps = 1000000 / precomputed.latency.mean

  const improvement = (((optimizedOps - baselineOps) / baselineOps) * 100).toFixed(2)
  const precomputedImprovement = (((precomputedOps - baselineOps) / baselineOps) * 100).toFixed(2)

  console.log(`✅ Broadcast cache vs baseline: ${improvement}% improvement`)
  console.log(`✅ Pre-serialized PONG vs baseline: ${precomputedImprovement}% improvement`)
}
