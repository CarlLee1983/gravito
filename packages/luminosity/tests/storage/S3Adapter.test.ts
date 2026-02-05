import { beforeEach, describe, expect, it } from 'bun:test'
import { S3Adapter, type S3ClientLike } from '../../src/storage/S3Adapter'

/**
 * 建立 mock S3 client，模擬 AWS SDK v3 行為
 */
function createMockS3() {
  const storage = new Map<string, { body: string; size: number }>()

  // 模擬 AWS SDK v3 command 建構子
  class MockPutObjectCommand {
    constructor(public args: any) {}
  }

  class MockGetObjectCommand {
    constructor(public args: any) {}
  }

  class MockHeadObjectCommand {
    constructor(public args: any) {}
  }

  class MockDeleteObjectCommand {
    constructor(public args: any) {}
  }

  const client: S3ClientLike = {
    send: async (command: any) => {
      if (command instanceof MockPutObjectCommand) {
        const { Key, Body } = command.args
        storage.set(Key, { body: Body, size: Body.length })
        return {}
      }

      if (command instanceof MockGetObjectCommand) {
        const { Key } = command.args
        const item = storage.get(Key)
        if (!item) {
          throw new Error(`NoSuchKey: ${Key}`)
        }
        return {
          Body: {
            transformToString: async () => item.body,
          },
        }
      }

      if (command instanceof MockHeadObjectCommand) {
        const { Key } = command.args
        const item = storage.get(Key)
        if (!item) {
          throw new Error(`NoSuchKey: ${Key}`)
        }
        return {
          ContentLength: item.size,
        }
      }

      if (command instanceof MockDeleteObjectCommand) {
        const { Key } = command.args
        storage.delete(Key)
        return {}
      }

      throw new Error('Unknown command')
    },
  }

  return {
    client,
    storage,
    commands: {
      PutObjectCommand: MockPutObjectCommand as any,
      GetObjectCommand: MockGetObjectCommand as any,
      HeadObjectCommand: MockHeadObjectCommand as any,
      DeleteObjectCommand: MockDeleteObjectCommand as any,
    },
  }
}

describe('S3Adapter', () => {
  let adapter: S3Adapter
  let mock: ReturnType<typeof createMockS3>

  beforeEach(() => {
    mock = createMockS3()
    adapter = new S3Adapter({
      bucket: 'test-bucket',
      region: 'us-east-1',
      client: mock.client,
      commands: mock.commands,
    })
  })

  describe('write()', () => {
    it('should write content to S3', async () => {
      await adapter.write('test.json', '{"data": true}')

      const stored = mock.storage.get('test.json')
      expect(stored).toBeDefined()
      expect(stored?.body).toBe('{"data": true}')
    })

    it('should overwrite existing content', async () => {
      await adapter.write('test.json', 'original')
      await adapter.write('test.json', 'updated')

      const stored = mock.storage.get('test.json')
      expect(stored?.body).toBe('updated')
    })
  })

  describe('read()', () => {
    it('should read content from S3', async () => {
      await adapter.write('test.json', 'hello world')

      const content = await adapter.read('test.json')
      expect(content).toBe('hello world')
    })

    it('should throw on non-existent key', async () => {
      await expect(adapter.read('nonexistent.json')).rejects.toThrow(
        'Failed to read nonexistent.json'
      )
    })
  })

  describe('exists()', () => {
    it('should return true for existing key', async () => {
      await adapter.write('exists.json', 'data')

      const result = await adapter.exists('exists.json')
      expect(result).toBe(true)
    })

    it('should return false for non-existent key', async () => {
      const result = await adapter.exists('missing.json')
      expect(result).toBe(false)
    })
  })

  describe('delete()', () => {
    it('should delete an existing key', async () => {
      await adapter.write('to-delete.json', 'data')
      expect(await adapter.exists('to-delete.json')).toBe(true)

      await adapter.delete('to-delete.json')
      expect(await adapter.exists('to-delete.json')).toBe(false)
    })

    it('should not throw when deleting non-existent key', async () => {
      // S3 delete 不會因為 key 不存在而拋錯
      await adapter.delete('nonexistent.json')
    })
  })

  describe('append()', () => {
    it('should append to existing content', async () => {
      await adapter.write('log.jsonl', 'line1\n')
      await adapter.append('log.jsonl', 'line2\n')

      const content = await adapter.read('log.jsonl')
      expect(content).toBe('line1\nline2\n')
    })

    it('should create new file when appending to non-existent key', async () => {
      await adapter.append('new.jsonl', 'first line\n')

      const content = await adapter.read('new.jsonl')
      expect(content).toBe('first line\n')
    })

    it('should handle multiple sequential appends', async () => {
      await adapter.append('multi.txt', 'a')
      await adapter.append('multi.txt', 'b')
      await adapter.append('multi.txt', 'c')

      const content = await adapter.read('multi.txt')
      expect(content).toBe('abc')
    })
  })

  describe('rename()', () => {
    it('should rename (move) an object', async () => {
      await adapter.write('old-name.json', 'content')

      await adapter.rename('old-name.json', 'new-name.json')

      expect(await adapter.exists('old-name.json')).toBe(false)
      expect(await adapter.exists('new-name.json')).toBe(true)

      const content = await adapter.read('new-name.json')
      expect(content).toBe('content')
    })

    it('should preserve content during rename', async () => {
      const data = JSON.stringify({ key: 'value', nested: { a: 1 } })
      await adapter.write('source.json', data)

      await adapter.rename('source.json', 'dest.json')

      const content = await adapter.read('dest.json')
      expect(content).toBe(data)
    })
  })

  describe('size()', () => {
    it('should return content length for existing object', async () => {
      await adapter.write('sized.json', 'hello') // 5 bytes

      const result = await adapter.size('sized.json')
      expect(result).toBe(5)
    })

    it('should return 0 for non-existent object', async () => {
      const result = await adapter.size('nonexistent.json')
      expect(result).toBe(0)
    })

    it('should handle objects with ContentLength of 0', async () => {
      await adapter.write('empty.json', '')
      const result = await adapter.size('empty.json')
      expect(result).toBe(0)
    })
  })

  describe('ensureDir()', () => {
    it('should be a no-op (S3 has no directories)', async () => {
      // 不應拋錯
      await adapter.ensureDir('/some/nested/path')
    })
  })

  describe('end-to-end workflow', () => {
    it('should handle a typical read-write-update-delete lifecycle', async () => {
      // 建立
      await adapter.write('data/item.json', '{"version": 1}')
      expect(await adapter.exists('data/item.json')).toBe(true)

      // 讀取
      const v1 = await adapter.read('data/item.json')
      expect(v1).toBe('{"version": 1}')

      // 更新
      await adapter.write('data/item.json', '{"version": 2}')
      const v2 = await adapter.read('data/item.json')
      expect(v2).toBe('{"version": 2}')

      // 大小
      expect(await adapter.size('data/item.json')).toBe('{"version": 2}'.length)

      // 重命名
      await adapter.rename('data/item.json', 'archive/item.json')
      expect(await adapter.exists('data/item.json')).toBe(false)
      expect(await adapter.exists('archive/item.json')).toBe(true)

      // 刪除
      await adapter.delete('archive/item.json')
      expect(await adapter.exists('archive/item.json')).toBe(false)
    })
  })
})
