import { randomBytes, randomUUID } from 'node:crypto'

type StartsEndsNeedle = string | readonly string[]

function splitWords(input: string): string[] {
  const normalized = input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()

  return normalized ? normalized.split(/\s+/) : []
}

function capitalize(word: string): string {
  if (!word) {
    return word
  }
  return word.charAt(0).toUpperCase() + word.slice(1)
}

export const Str = {
  lower(value: string): string {
    return value.toLowerCase()
  },

  upper(value: string): string {
    return value.toUpperCase()
  },

  startsWith(haystack: string, needles: StartsEndsNeedle): boolean {
    const list = Array.isArray(needles) ? needles : [needles]
    for (const needle of list) {
      if (needle !== '' && haystack.startsWith(needle)) {
        return true
      }
    }
    return false
  },

  endsWith(haystack: string, needles: StartsEndsNeedle): boolean {
    const list = Array.isArray(needles) ? needles : [needles]
    for (const needle of list) {
      if (needle !== '' && haystack.endsWith(needle)) {
        return true
      }
    }
    return false
  },

  contains(haystack: string, needles: StartsEndsNeedle): boolean {
    const list = Array.isArray(needles) ? needles : [needles]
    for (const needle of list) {
      if (needle !== '' && haystack.includes(needle)) {
        return true
      }
    }
    return false
  },

  snake(value: string): string {
    const words = splitWords(value).map((w) => w.toLowerCase())
    return words.join('_')
  },

  kebab(value: string): string {
    const words = splitWords(value).map((w) => w.toLowerCase())
    return words.join('-')
  },

  studly(value: string): string {
    return splitWords(value)
      .map((w) => capitalize(w.toLowerCase()))
      .join('')
  },

  camel(value: string): string {
    const words = splitWords(value).map((w) => w.toLowerCase())
    if (words.length === 0) {
      return ''
    }
    const first = words[0]
    if (first === undefined) {
      return ''
    }
    return first + words.slice(1).map(capitalize).join('')
  },

  title(value: string): string {
    return splitWords(value)
      .map((w) => capitalize(w.toLowerCase()))
      .join(' ')
  },

  limit(value: string, limit: number, end = '...'): string {
    if (limit < 0) {
      return ''
    }
    if (value.length <= limit) {
      return value
    }
    return value.slice(0, limit) + end
  },

  slug(value: string, separator = '-'): string {
    const normalized = value
      .normalize('NFKD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()

    const escaped = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return normalized
      .replace(/[^a-z0-9]+/g, separator)
      .replace(new RegExp(`^${escaped}+|${escaped}+$`, 'g'), '')
  },

  uuid(): string {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID()
    }
    return randomUUID()
  },

  random(length = 16): string {
    if (length <= 0) {
      return ''
    }
    // base64url: [A-Za-z0-9_-]
    const bytes = randomBytes(Math.ceil((length * 3) / 4) + 2)
    const str = bytes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
    return str.slice(0, length)
  },
} as const
