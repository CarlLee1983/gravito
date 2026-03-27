import { statSync } from 'fs'

function getFileSize(path: string): number {
  try {
    const stat = statSync(path)
    return stat.size
  } catch (_e) {
    console.warn(`Could not read file: ${path}`)
    return 0
  }
}

function formatSize(bytes: number): { bytes: number; kb: number; gzip_est_kb: number } {
  const kb = bytes / 1024
  const gzip_est_kb = Math.round((bytes * 0.35) / 1024) // Typical JS gzip ratio
  return {
    bytes,
    kb: Math.round(kb * 100) / 100,
    gzip_est_kb,
  }
}

const bundles = {
  photon: {
    esm: 'packages/photon/dist/index.js',
  },
  core: {
    esm: 'packages/core/dist/index.js',
  },
  signal: {
    esm: 'packages/signal/dist/index.mjs',
    cjs: 'packages/signal/dist/index.cjs',
  },
}

const result: any = {
  timestamp: new Date().toISOString(),
  packages: {},
  total_esm_kb: 0,
  total_cjs_kb: 0,
}

for (const [name, paths] of Object.entries(bundles)) {
  const esmSize = getFileSize((paths as any).esm)
  const cjsSize = getFileSize((paths as any).cjs || '')

  const esm = formatSize(esmSize)
  const cjs = formatSize(cjsSize)

  result.packages[name] = {
    esm_bytes: esm.bytes,
    esm_kb: esm.kb,
    cjs_bytes: cjs.bytes,
    cjs_kb: cjs.kb,
    gzip_estimate_kb: esm.gzip_est_kb,
  }

  result.total_esm_kb += esm.kb
  if (cjsSize > 0) {
    result.total_cjs_kb += cjs.kb
  }
}

result.total_esm_kb = Math.round(result.total_esm_kb * 100) / 100
result.total_cjs_kb = Math.round(result.total_cjs_kb * 100) / 100

console.log(JSON.stringify(result, null, 2))
