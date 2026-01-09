#!/usr/bin/env node
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const command = args[0]

const help = () => {
  console.log(`Flux CLI

Usage:
  flux dev --trace ./.flux/trace.ndjson --port 4280
`)
}

if (!command || command === '--help' || command === '-h') {
  help()
  process.exit(0)
}

if (command !== 'dev') {
  console.error(`Unknown command: ${command}`)
  help()
  process.exit(1)
}

const getArg = (name, fallback) => {
  const idx = args.indexOf(name)
  if (idx === -1) return fallback
  return args[idx + 1] ?? fallback
}

const port = Number(getArg('--port', '4280'))
const host = getArg('--host', '127.0.0.1')
const tracePath = resolve(getArg('--trace', './.flux/trace.ndjson'))

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const viewerRoot = resolve(join(__dirname, '..', 'dev', 'viewer'))

const contentType = (filePath) => {
  const ext = extname(filePath)
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8'
    case '.js':
      return 'text/javascript; charset=utf-8'
    case '.css':
      return 'text/css; charset=utf-8'
    case '.json':
      return 'application/json; charset=utf-8'
    case '.svg':
      return 'image/svg+xml'
    default:
      return 'text/plain; charset=utf-8'
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${host}:${port}`)
    if (url.pathname === '/trace') {
      try {
        const data = await readFile(tracePath, 'utf8')
        res.writeHead(200, {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'no-store',
        })
        res.end(data)
      } catch {
        res.writeHead(204, { 'cache-control': 'no-store' })
        res.end('')
      }
      return
    }

    const reqPath = url.pathname === '/' ? '/index.html' : url.pathname
    const filePath = join(viewerRoot, reqPath)
    const data = await readFile(filePath)
    res.writeHead(200, {
      'content-type': contentType(filePath),
      'cache-control': 'no-store',
    })
    res.end(data)
  } catch (err) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Not Found')
  }
})

server.listen(port, host, () => {
  console.log(`Flux dev viewer running at http://${host}:${port}`)
  console.log(`Trace file: ${tracePath}`)
})
