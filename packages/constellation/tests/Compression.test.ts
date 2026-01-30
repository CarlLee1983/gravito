import { describe, expect, it } from 'bun:test'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createGunzip } from 'node:zlib'
import {
  compressToBuffer,
  createCompressionStream,
  fromGzipFilename,
  toGzipFilename,
} from '../src/utils/Compression'

describe('Compression Utilities', () => {
  describe('toGzipFilename', () => {
    it('應該正確加上 .gz 副檔名', () => {
      expect(toGzipFilename('sitemap.xml')).toBe('sitemap.xml.gz')
      expect(toGzipFilename('sitemap-1.xml')).toBe('sitemap-1.xml.gz')
    })

    it('不應該重複加上 .gz 副檔名', () => {
      expect(toGzipFilename('sitemap.xml.gz')).toBe('sitemap.xml.gz')
    })
  })

  describe('fromGzipFilename', () => {
    it('應該正確移除 .gz 副檔名', () => {
      expect(fromGzipFilename('sitemap.xml.gz')).toBe('sitemap.xml')
      expect(fromGzipFilename('sitemap-1.xml.gz')).toBe('sitemap-1.xml')
    })

    it('對於沒有 .gz 的檔案應該保持不變', () => {
      expect(fromGzipFilename('sitemap.xml')).toBe('sitemap.xml')
    })
  })

  describe('compressToBuffer', () => {
    it('應該正確壓縮 AsyncIterable 為 gzip Buffer', async () => {
      const source = (async function* () {
        yield '<?xml version="1.0" encoding="UTF-8"?>\n'
        yield '<urlset>\n'
        yield '  <url><loc>https://example.com/page1</loc></url>\n'
        yield '</urlset>'
      })()

      const compressed = await compressToBuffer(source)

      // 驗證是 Buffer
      expect(compressed).toBeInstanceOf(Buffer)

      // 驗證可以解壓縮回原始內容
      const decompressed = await decompressBuffer(compressed)
      expect(decompressed).toContain('<?xml version="1.0"')
      expect(decompressed).toContain('<urlset>')
      expect(decompressed).toContain('https://example.com/page1')
      expect(decompressed).toContain('</urlset>')
    })

    it('應該支援自訂壓縮等級', async () => {
      const source = (async function* () {
        yield 'Hello World '.repeat(100)
      })()

      const compressed = await compressToBuffer(source, { level: 9 })
      expect(compressed).toBeInstanceOf(Buffer)
      expect(compressed.length).toBeGreaterThan(0)
    })
  })

  describe('createCompressionStream', () => {
    it('應該建立可用的壓縮 Transform stream', async () => {
      const source = Readable.from(['Hello ', 'World ', 'from ', 'stream!'])
      const gzip = createCompressionStream()
      const chunks: Buffer[] = []

      source.pipe(gzip)

      for await (const chunk of gzip) {
        chunks.push(chunk as Buffer)
      }

      const compressed = Buffer.concat(chunks)
      const decompressed = await decompressBuffer(compressed)

      expect(decompressed).toBe('Hello World from stream!')
    })

    it('應該支援自訂壓縮等級', async () => {
      const source = Readable.from(['test '.repeat(50)])
      const gzip = createCompressionStream({ level: 1 })
      const chunks: Buffer[] = []

      source.pipe(gzip)

      for await (const chunk of gzip) {
        chunks.push(chunk as Buffer)
      }

      const compressed = Buffer.concat(chunks)
      expect(compressed).toBeInstanceOf(Buffer)
    })
  })
})

/**
 * 輔助函式：解壓縮 gzip Buffer 為字串
 */
async function decompressBuffer(buffer: Buffer): Promise<string> {
  const gunzip = createGunzip()
  const chunks: Buffer[] = []

  await pipeline(Readable.from([buffer]), gunzip, async function* (source) {
    for await (const chunk of source) {
      chunks.push(chunk as Buffer)
      yield chunk
    }
  })

  return Buffer.concat(chunks).toString('utf-8')
}
