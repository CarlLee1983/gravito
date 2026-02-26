/**
 * Universal Crypto wrapper.
 * Automatically switches between node:crypto and globalThis.crypto.
 */

let randomUUIDFn: () => string
let randomBytesFn: (size: number) => any

const tryGetNodeCrypto = () => {
  try {
    if (typeof window === 'undefined' && typeof process !== 'undefined' && !(process as any).browser) {
      // biome-ignore lint/security/noGlobalEval: specialized case for hiding node built-ins
      return eval('require')('node:crypto')
    }
  } catch (e) {
    return null
  }
}

const nodeCrypto = tryGetNodeCrypto()

if (nodeCrypto) {
  randomUUIDFn = nodeCrypto.randomUUID
  randomBytesFn = nodeCrypto.randomBytes
} else {
  // Browser implementations
  randomUUIDFn = () => {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID()
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  randomBytesFn = (size: number) => {
    const bytes = new Uint8Array(size)
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
      globalThis.crypto.getRandomValues(bytes)
    } else {
      for (let i = 0; i < size; i++) {
        bytes[i] = Math.floor(Math.random() * 256)
      }
    }
    // Return a Buffer-like object
    return {
      length: size,
      [Symbol.iterator]: () => bytes[Symbol.iterator](),
      toString: (encoding: string) => {
        if (encoding === 'base64') {
          let binary = ''
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i])
          }
          return btoa(binary)
        }
        if (encoding === 'hex') {
          return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
        }
        return ''
      },
      ...Array.from(bytes),
    }
  }
}

export const randomUUID = randomUUIDFn
export const randomBytes = randomBytesFn
