import { RegExpRouter } from '@gravito/photon/router/reg-exp-router'
import { TrieRouter } from '@gravito/photon/router/trie-router'
import { RadixRouter } from '../src/adapters/bun/RadixRouter'

// Simple placeholder handler since functions aren't serialized
const noop = () => new Response('ok')

// Helper to generate routes
function generateRoutes(count: number, type: 'static' | 'dynamic' | 'wildcard'): string[] {
  const routes: string[] = []
  for (let i = 0; i < count; i++) {
    if (type === 'static') {
      routes.push(`/api/v1/users/${i}`)
    } else if (type === 'dynamic') {
      routes.push(`/api/v1/users/${i}/:action`)
    } else if (type === 'wildcard') {
      routes.push(`/files/${i}/*`)
    }
  }
  return routes
}

async function benchmarkRouter(name: string, routerImpl: any, routes: string[], method = 'get') {
  // 1. Boot Time
  const startBoot = performance.now()
  const router = new routerImpl()
  for (const path of routes) {
    router.add(method, path, [noop])
  }
  const endBoot = performance.now()

  // 2. Lookup Time
  const iterations = 100000
  const startLookup = performance.now()
  for (let i = 0; i < iterations; i++) {
    const target = routes[i % routes.length]
    router.match(method, target)
  }
  const endLookup = performance.now()

  const bootTime = (endBoot - startBoot).toFixed(2)
  const duration = endLookup - startLookup
  const ops = (iterations / duration) * 1000

  console.log(`  ${name.padEnd(15)} | Boot: ${bootTime}ms | Lookup: ${ops.toFixed(0)} ops/sec`)

  return { bootTime, ops }
}

async function runBenchmarks() {
  console.log('--- Gravito RadixRouter vs Photon Benchmarks ---\n')

  const counts = [50, 500, 5000]

  for (const count of counts) {
    console.log(`\n[Scenario: ${count} routes (Mixed Static)]`)
    const routes = generateRoutes(count, 'static')

    await benchmarkRouter('RadixRouter', RadixRouter, routes)
    try {
      await benchmarkRouter('Photon(RegExp)', RegExpRouter, routes)
    } catch (_e) {
      // RegExpRouter might fail with too many routes due to regex size limits
      console.log('  Photon(RegExp)  | Failed (Likely route limit)')
    }
    try {
      await benchmarkRouter('Photon(Trie)', TrieRouter, routes)
    } catch (_e) {
      console.log('  Photon(Trie)    | Failed')
    }
  }

  console.log(`\n[Scenario: 1000 routes (Dynamic Params)]`)
  const dynamicRoutes = generateRoutes(1000, 'dynamic')
  await benchmarkRouter('RadixRouter', RadixRouter, dynamicRoutes)
  try {
    await benchmarkRouter('Photon(RegExp)', RegExpRouter, dynamicRoutes)
  } catch (_e) {
    console.log('  Photon(RegExp)  | Failed')
  }
  try {
    await benchmarkRouter('Photon(Trie)', TrieRouter, dynamicRoutes)
  } catch (_e) {
    console.log('  Photon(Trie)    | Failed')
  }

  // Serialization Check
  console.log('\n[Serialization Check - 5000 Routes]')
  const r = new RadixRouter()
  const routes5k = generateRoutes(5000, 'static')
  for (const p of routes5k) {
    r.add('get', p, [noop])
  }

  const startSer = performance.now()
  const json = r.serialize()
  const endSer = performance.now()
  console.log(
    `  Serialize     : ${(endSer - startSer).toFixed(2)}ms | Size: ${(json.length / 1024).toFixed(2)} KB`
  )

  const startDes = performance.now()
  RadixRouter.fromSerialized(json)
  const endDes = performance.now()
  console.log(`  Deserialize   : ${(endDes - startDes).toFixed(2)}ms`)
}

runBenchmarks()
