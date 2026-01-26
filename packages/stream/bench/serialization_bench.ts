import { bench, group, run, summary } from 'mitata'
import { Job } from '../src/Job'
import { CachedSerializer } from '../src/serializers/CachedSerializer'
import { JsonSerializer } from '../src/serializers/JsonSerializer'
import { MessagePackSerializer } from '../src/serializers/MessagePackSerializer'

class TestJob extends Job {
  constructor(public data: any) {
    super()
  }
  async handle() {}
}

const largeData = {
  id: 'test-id',
  user: {
    id: 123,
    name: 'John Doe',
    email: 'john@example.com',
    roles: ['admin', 'user', 'manager'],
    preferences: {
      theme: 'dark',
      notifications: true,
    },
  },
  items: Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    price: Math.random() * 100,
  })),
  meta: {
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}

const job = new TestJob(largeData)

const jsonSerializer = new JsonSerializer()
const cachedSerializer = new CachedSerializer(jsonSerializer)
const msgpackSerializer = new MessagePackSerializer()

summary(() => {
  group('Serialization', () => {
    bench('JSON', () => {
      jsonSerializer.serialize(job)
    })

    bench('Cached JSON (First run overhead + subsequent)', () => {
      // Note: This benchmark hits the cache every time after the first one in the loop setup?
      // Mitata runs the function many times. The SAME job instance is passed.
      // So this effectively benchmarks the cache HIT speed.
      cachedSerializer.serialize(job)
    })

    bench('MessagePack', () => {
      msgpackSerializer.serialize(job)
    })
  })

  group('Deserialization', () => {
    const jsonSerialized = jsonSerializer.serialize(job)
    const msgpackSerialized = msgpackSerializer.serialize(job)

    bench('JSON', () => {
      jsonSerializer.deserialize(jsonSerialized)
    })

    bench('MessagePack', () => {
      msgpackSerializer.deserialize(msgpackSerialized)
    })
  })
})

async function main() {
  await run()

  console.log('\n--- Payload Size ---')
  const jsonSize = jsonSerializer.serialize(job).data.length
  const msgpackSize = msgpackSerializer.serialize(job).data.length

  console.log(`JSON Size: ${jsonSize} chars`)
  console.log(`MsgPack (Base64) Size: ${msgpackSize} chars`)
  console.log(`Difference: ${(((msgpackSize - jsonSize) / jsonSize) * 100).toFixed(2)}%`)
}

main()
