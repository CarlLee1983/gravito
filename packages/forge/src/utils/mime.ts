import { open } from 'node:fs/promises'

const HEADER_SIZE = 16

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end))
}

async function readHeader(source: string | Blob): Promise<Uint8Array | null> {
  if (typeof source === 'string') {
    if (/^https?:\/\//i.test(source)) {
      return null
    }
    try {
      const handle = await open(source, 'r')
      try {
        const buffer = Buffer.alloc(HEADER_SIZE)
        const { bytesRead } = await handle.read(buffer, 0, HEADER_SIZE, 0)
        if (bytesRead <= 0) {
          return null
        }
        return new Uint8Array(buffer.slice(0, bytesRead))
      } finally {
        await handle.close()
      }
    } catch {
      return null
    }
  }

  const slice = source.slice(0, HEADER_SIZE)
  const buffer = await slice.arrayBuffer()
  return new Uint8Array(buffer)
}

export async function sniffMimeType(source: string | Blob): Promise<string | null> {
  const bytes = await readHeader(source)
  if (!bytes || bytes.length === 0) {
    return null
  }

  // PNG
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png'
  }

  // JPEG
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }

  // GIF
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return 'image/gif'
  }

  // WebP ("RIFF....WEBP")
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') {
    return 'image/webp'
  }

  // WebM
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return 'video/webm'
  }

  // MP4/MOV ("....ftyp")
  if (bytes.length >= 12 && ascii(bytes, 4, 8) === 'ftyp') {
    const brand = ascii(bytes, 8, 12)
    if (brand === 'qt  ') {
      return 'video/quicktime'
    }
    return 'video/mp4'
  }

  return null
}
