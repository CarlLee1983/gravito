import { bench, group, run } from 'mitata'
import { BinarySerializer } from '../src/serializers/BinarySerializer'
import { JsonSerializer } from '../src/serializers/JsonSerializer'
import { MessagePackSerializer } from '../src/serializers/MessagePackSerializer'

const jsonSerializer = new JsonSerializer()
const msgpackSerializer = new MessagePackSerializer()
const binarySerializer = new BinarySerializer()

const smallJob = {
  id: 'test-123',
  data: { userId: 1, action: 'test', nested: { deep: { value: 42 } } },
} as any

const largeJob = {
  id: 'test-456',
  data: {
    items: Array(100)
      .fill(0)
      .map((_, i) => ({
        id: i,
        name: `item-${i}`,
        value: `test-data-${i}`,
        metadata: {
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
      })),
  },
} as any

group('Serialization (Small Payload)', () => {
  bench('JsonSerializer', () => {
    jsonSerializer.serialize(smallJob)
  })
  bench('MessagePackSerializer', () => {
    msgpackSerializer.serialize(smallJob)
  })
  bench('BinarySerializer', () => {
    binarySerializer.serialize(smallJob)
  })
})

group('Serialization (Large Payload)', () => {
  bench('JsonSerializer', () => {
    jsonSerializer.serialize(largeJob)
  })
  bench('MessagePackSerializer', () => {
    msgpackSerializer.serialize(largeJob)
  })
  bench('BinarySerializer', () => {
    binarySerializer.serialize(largeJob)
  })
})

group('Deserialization (Small Payload)', () => {
  const jsonSerialized = jsonSerializer.serialize(smallJob)
  const msgpackSerialized = msgpackSerializer.serialize(smallJob)
  const binarySerialized = binarySerializer.serialize(smallJob)

  bench('JsonSerializer', () => {
    jsonSerializer.deserialize(jsonSerialized)
  })
  bench('MessagePackSerializer', () => {
    msgpackSerializer.deserialize(msgpackSerialized)
  })
  bench('BinarySerializer', () => {
    binarySerializer.deserialize(binarySerialized)
  })
})

group('Deserialization (Large Payload)', () => {
  const jsonSerialized = jsonSerializer.serialize(largeJob)
  const msgpackSerialized = msgpackSerializer.serialize(largeJob)
  const binarySerialized = binarySerializer.serialize(largeJob)

  bench('JsonSerializer', () => {
    jsonSerializer.deserialize(jsonSerialized)
  })
  bench('MessagePackSerializer', () => {
    msgpackSerializer.deserialize(msgpackSerialized)
  })
  bench('BinarySerializer', () => {
    binarySerializer.deserialize(binarySerialized)
  })
})

group('Round-trip (Small Payload)', () => {
  bench('JsonSerializer', () => {
    const serialized = jsonSerializer.serialize(smallJob)
    jsonSerializer.deserialize(serialized)
  })
  bench('MessagePackSerializer', () => {
    const serialized = msgpackSerializer.serialize(smallJob)
    msgpackSerializer.deserialize(serialized)
  })
  bench('BinarySerializer', () => {
    const serialized = binarySerializer.serialize(smallJob)
    binarySerializer.deserialize(serialized)
  })
})

group('Round-trip (Large Payload)', () => {
  bench('JsonSerializer', () => {
    const serialized = jsonSerializer.serialize(largeJob)
    jsonSerializer.deserialize(serialized)
  })
  bench('MessagePackSerializer', () => {
    const serialized = msgpackSerializer.serialize(largeJob)
    msgpackSerializer.deserialize(serialized)
  })
  bench('BinarySerializer', () => {
    const serialized = binarySerializer.serialize(largeJob)
    binarySerializer.deserialize(serialized)
  })
})

await run()
