import { describe, expect, it } from 'bun:test'
import { Job } from '../src/Job'
import { MessagePackSerializer } from '../src/serializers/MessagePackSerializer'

class TestJob extends Job {
  constructor(public data: any) {
    super()
  }

  async handle() {}
}

describe('MessagePackSerializer', () => {
  it('should serialize and deserialize a job', () => {
    const serializer = new MessagePackSerializer()
    const job = new TestJob({ foo: 'bar', num: 123, nested: { a: 1 } })
    job.onQueue('test-queue').delay(10)

    const serialized = serializer.serialize(job)

    expect(serialized.type).toBe('msgpack')
    expect(typeof serialized.data).toBe('string')
    expect(serialized.delaySeconds).toBe(10)

    const deserialized = serializer.deserialize(serialized) as TestJob
    expect(deserialized.data.foo).toBe('bar')
    expect(deserialized.data.num).toBe(123)
    expect(deserialized.data.nested.a).toBe(1)
    expect(deserialized.id).toBe(serialized.id)
    expect(deserialized.delaySeconds).toBe(10)
  })

  it('should handle complex types supported by MsgPack', () => {
    const serializer = new MessagePackSerializer()
    const job = new TestJob({
      date: new Date('2023-01-01'),
      bytes: new Uint8Array([1, 2, 3]),
    })

    const serialized = serializer.serialize(job)
    const deserialized = serializer.deserialize(serialized) as TestJob

    expect(deserialized.data.date).toBeInstanceOf(Date)
    expect(deserialized.data.date.toISOString()).toBe('2023-01-01T00:00:00.000Z')
    // Note: msgpack-javascript might deserialize Uint8Array as Buffer or Uint8Array depending on config.
    // Let's check what it returns.
    // By default it returns Uint8Array.
    expect(deserialized.data.bytes).toEqual(new Uint8Array([1, 2, 3]))
  })
})
