import { afterAll, beforeAll } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { bootstrap } from '../../src/bootstrap'

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'sqlite::memory:'
}

let core: PlanetCore

beforeAll(async () => {
  core = await bootstrap()
})

afterAll(() => {
  core?.liftoff()?.fetch
})

function buildUrl(uri: string) {
  if (uri.startsWith('http')) return uri
  if (!uri.startsWith('/')) {
    return `http://localhost/${uri}`
  }
  return `http://localhost${uri}`
}

async function call(
  method: string,
  uri: string,
  data: any = null,
  headers: Record<string, string> = {}
) {
  const url = buildUrl(uri)
  const requestOpts: RequestInit = { method, headers: { ...headers } }
  if (data) {
    if (typeof data === 'object') {
      requestOpts.body = JSON.stringify(data)
      requestOpts.headers = { 'content-type': 'application/json', ...requestOpts.headers }
    } else {
      requestOpts.body = data
    }
  }
  const response = await core.adapter.fetch(new Request(url, requestOpts))
  return response
}

export function tester() {
  return {
    get: (uri: string, headers?: Record<string, string>) => call('GET', uri, null, headers),
    post: (uri: string, data: any, headers?: Record<string, string>) =>
      call('POST', uri, data, headers),
    put: (uri: string, data: any, headers?: Record<string, string>) =>
      call('PUT', uri, data, headers),
    delete: (uri: string, data: any, headers?: Record<string, string>) =>
      call('DELETE', uri, data, headers),
  }
}
