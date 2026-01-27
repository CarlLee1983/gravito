import { bench, describe } from 'vitest'
import {
  CborSerializer,
  JsonSerializer,
  MsgPackSerializer,
  ProtobufSerializer,
} from '../src/utils/Serializer'

describe('Serialization Performance', () => {
  const json = new JsonSerializer()
  const msgpack = new MsgPackSerializer()
  const cbor = new CborSerializer()
  const protobuf = new ProtobufSerializer()

  const samplePayload = {
    level: 'info',
    message: 'Processing job: email-sender',
    jobId: '12345',
    workerId: 'worker-1',
    timestamp: new Date().toISOString(),
    traceId: 'trace-abcdef123456',
    spanId: 'span-7890',
    context: {
      retryCount: 3,
      priority: 'high',
      user: { id: 1, name: 'John Doe' },
    },
  }

  bench('JSON Serialization', () => {
    json.serialize(samplePayload)
  })

  bench('MessagePack Serialization', () => {
    msgpack.serialize(samplePayload)
  })

  bench('CBOR Serialization', () => {
    cbor.serialize(samplePayload)
  })

  bench('Protobuf Serialization', () => {
    protobuf.serialize(samplePayload)
  })

  const jsonEncoded = json.serialize(samplePayload)
  const msgpackEncoded = msgpack.serialize(samplePayload)
  const cborEncoded = cbor.serialize(samplePayload)
  const protobufEncoded = protobuf.serialize(samplePayload)

  bench('JSON Deserialization', () => {
    json.deserialize(jsonEncoded)
  })

  bench('MessagePack Deserialization', () => {
    msgpack.deserialize(msgpackEncoded)
  })

  bench('CBOR Deserialization', () => {
    cbor.deserialize(cborEncoded)
  })

  bench('Protobuf Deserialization', () => {
    protobuf.deserialize(protobufEncoded)
  })

  console.log('\n--- Payload Size Comparison ---')
  console.log(`Original Object JSON string length: ${JSON.stringify(samplePayload).length}`)
  console.log(`JSON Buffer length: ${Buffer.from(json.serialize(samplePayload)).length}`)
  console.log(`MessagePack length: ${msgpack.serialize(samplePayload).length}`)
  console.log(`CBOR length: ${cbor.serialize(samplePayload).length}`)
  console.log(`Protobuf length: ${protobuf.serialize(samplePayload).length}`)
})
