import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LocalStore } from '../src/stores/LocalStore'
import { MemoryStore } from '../src/stores/MemoryStore'

let tempDir = ''
let localStore: LocalStore
let memoryStore: MemoryStore

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'nebula-stream-'))
  localStore = new LocalStore(tempDir, '/storage')
  memoryStore = new MemoryStore()
})

afterAll(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true })
  }
})

/**
 * Helper function to create a ReadableStream from string data
 * 輔助函數：從字串建立 ReadableStream
 */
function createStreamFromString(data: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(data))
      controller.close()
    },
  })
}

/**
 * Helper function to create a large ReadableStream for testing
 * 輔助函數：建立大型 ReadableStream 用於測試
 */
function createLargeStream(sizeInMB: number): ReadableStream<Uint8Array> {
  const chunkSize = 1024 * 1024 // 1MB chunks
  const totalChunks = sizeInMB
  let currentChunk = 0

  return new ReadableStream({
    pull(controller) {
      if (currentChunk >= totalChunks) {
        controller.close()
        return
      }

      // Create a 1MB chunk of data
      const chunk = new Uint8Array(chunkSize).fill(65 + (currentChunk % 26)) // A-Z pattern
      controller.enqueue(chunk)
      currentChunk++
    },
  })
}

/**
 * Helper function to read stream to string
 * 輔助函數：將 stream 讀取為字串
 */
async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let result = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    result += decoder.decode(value, { stream: true })
  }

  return result
}

describe('LocalStore - Stream Operations', () => {
  it('應該能夠使用 putStream 和 getStream 處理小檔案', async () => {
    const testData = 'Hello, Stream World!'
    const stream = createStreamFromString(testData)

    await localStore.putStream('stream-test.txt', stream)

    const resultStream = await localStore.getStream('stream-test.txt')
    expect(resultStream).not.toBeNull()

    const resultData = await streamToString(resultStream!)
    expect(resultData).toBe(testData)
  })

  it('應該能夠使用 putStream 處理大檔案而不會 OOM', async () => {
    const sizeInMB = 10 // 10MB 測試檔案
    const largeStream = createLargeStream(sizeInMB)

    // 記錄開始前的記憶體使用
    const memBefore = process.memoryUsage().heapUsed

    await localStore.putStream('large-file.bin', largeStream)

    // 記錄完成後的記憶體使用
    const memAfter = process.memoryUsage().heapUsed
    const memDiff = (memAfter - memBefore) / (1024 * 1024) // Convert to MB

    // 記憶體增加應該遠小於檔案大小（證明串流有效）
    expect(memDiff).toBeLessThan(sizeInMB * 0.5) // 應該少於檔案大小的 50%

    // 驗證檔案存在且大小正確
    expect(await localStore.exists('large-file.bin')).toBe(true)
    const meta = await localStore.getMetadata('large-file.bin')
    expect(meta?.size).toBe(sizeInMB * 1024 * 1024)
  })

  it('getStream 應該對不存在的檔案回傳 null', async () => {
    const stream = await localStore.getStream('non-existent-stream.txt')
    expect(stream).toBeNull()
  })

  it('應該能夠處理多個連續的 stream 操作', async () => {
    const files = ['stream1.txt', 'stream2.txt', 'stream3.txt']
    const testData = 'Sequential stream test'

    for (const file of files) {
      const stream = createStreamFromString(testData)
      await localStore.putStream(file, stream)
    }

    for (const file of files) {
      const resultStream = await localStore.getStream(file)
      expect(resultStream).not.toBeNull()
      const data = await streamToString(resultStream!)
      expect(data).toBe(testData)
    }
  })

  it('應該能夠處理包含特殊字元的串流資料', async () => {
    const testData = '特殊字元測試 🚀 \n\t Special chars: <>?:"{}|'
    const stream = createStreamFromString(testData)

    await localStore.putStream('special-chars.txt', stream)

    const resultStream = await localStore.getStream('special-chars.txt')
    const resultData = await streamToString(resultStream!)
    expect(resultData).toBe(testData)
  })

  it('應該能夠處理巢狀目錄中的串流檔案', async () => {
    const testData = 'Nested directory stream test'
    const stream = createStreamFromString(testData)

    await localStore.putStream('deep/nested/dir/stream-file.txt', stream)

    expect(await localStore.exists('deep/nested/dir/stream-file.txt')).toBe(true)
    const resultStream = await localStore.getStream('deep/nested/dir/stream-file.txt')
    const resultData = await streamToString(resultStream!)
    expect(resultData).toBe(testData)
  })
})

describe('MemoryStore - Stream Operations', () => {
  it('應該能夠使用 putStream 和 getStream 處理資料', async () => {
    const testData = 'Memory Stream Test'
    const stream = createStreamFromString(testData)

    await memoryStore.putStream('mem-stream.txt', stream)

    const resultStream = await memoryStore.getStream('mem-stream.txt')
    expect(resultStream).not.toBeNull()

    const resultData = await streamToString(resultStream!)
    expect(resultData).toBe(testData)
  })

  it('getStream 應該對不存在的檔案回傳 null', async () => {
    const stream = await memoryStore.getStream('non-existent-mem-stream.txt')
    expect(stream).toBeNull()
  })

  it('應該能夠處理二進位資料串流', async () => {
    // 建立二進位資料串流
    const binaryData = new Uint8Array([0, 1, 2, 3, 4, 5, 255, 254, 253])
    const binaryStream = new ReadableStream({
      start(controller) {
        controller.enqueue(binaryData)
        controller.close()
      },
    })

    await memoryStore.putStream('binary.bin', binaryStream)

    const resultStream = await memoryStore.getStream('binary.bin')
    expect(resultStream).not.toBeNull()

    // 讀取並驗證二進位資料
    const reader = resultStream?.getReader()
    const chunks: Uint8Array[] = []

    while (reader) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      chunks.push(value)
    }

    // 合併所有 chunks
    const resultData = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
    let offset = 0
    for (const chunk of chunks) {
      resultData.set(chunk, offset)
      offset += chunk.length
    }

    expect(resultData).toEqual(binaryData)
  })

  it('應該能夠處理空串流', async () => {
    const emptyStream = new ReadableStream({
      start(controller) {
        controller.close()
      },
    })

    await memoryStore.putStream('empty.txt', emptyStream)

    expect(await memoryStore.exists('empty.txt')).toBe(true)
    const meta = await memoryStore.getMetadata('empty.txt')
    expect(meta?.size).toBe(0)
  })
})

describe('Stream - 錯誤處理', () => {
  it('LocalStore putStream 應該在路徑遍歷時拋出錯誤', async () => {
    const testData = 'Malicious data'
    const stream = createStreamFromString(testData)

    await expect(localStore.putStream('../../../etc/passwd', stream)).rejects.toThrow()
  })

  it('應該能夠處理 stream 讀取過程中的錯誤', async () => {
    let shouldError = false
    const errorStream = new ReadableStream({
      pull(controller) {
        if (shouldError) {
          controller.error(new Error('Stream read error'))
          return
        }
        shouldError = true
        controller.enqueue(new TextEncoder().encode('Some data'))
      },
    })

    await expect(localStore.putStream('error-test.txt', errorStream)).rejects.toThrow()
  })
})
