#!/usr/bin/env bun
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const args = process.argv.slice(2)
const command = args[0]

console.log(`✨ Luminosity CLI Beta`)

async function main() {
  switch (command) {
    case 'stats':
      await showStats()
      break
    case 'warm':
      console.log('🔥 Warming cache... (Not implemented yet)')
      break
    case 'generate':
      console.log('⚙️  Generating sitemap... (Not implemented yet)')
      break
    case 'init':
      console.log('📝 Creating luminosity.config.ts... (Not implemented yet)')
      break
    case 'repair':
      await repairStorage()
      break
    case 'inspect':
      if (!args[1]) {
        console.error('Usage: lux inspect <url>')
        process.exit(1)
      }
      await inspectUrl(args[1])
      break
    default:
      console.log('Usage: lux <command> [options]')
      console.log('Commands: generate, stats, warm, init, repair, inspect')
  }
}

async function inspectUrl(url: string) {
  const { MetaInspector } = await import('./meta/Inspector')
  const inspector = new MetaInspector()

  console.log(`🔍 Inspecting ${url}...\n`)
  try {
    const preview = await inspector.inspect(url)

    // Google Search Preview
    console.log('\x1b[1m=== Google Search Preview ===\x1b[0m')
    console.log(`\x1b[34m${preview.title || 'No Title'}\x1b[0m`) // Blue title
    console.log(`\x1b[32m${preview.url}\x1b[0m`) // Green URL
    console.log(`${preview.description || 'No description available.'}`)
    console.log('')

    // OpenGraph Preview
    console.log('\x1b[1m=== Social Media (OpenGraph) ===\x1b[0m')
    if (preview.og?.image) {
      console.log(`🖼  [Image: ${preview.og.image}]`)
    }
    console.log(`\x1b[1m${preview.og?.title || preview.title || 'No Title'}\x1b[0m`)
    console.log(`${preview.og?.description || preview.description || 'No description'}`)
    console.log(`\x1b[90m${preview.url?.replace(/^https?:\/\//, '')}\x1b[0m`) // Grey domain
    console.log('')

    // Analysis / Warnings
    console.log('\x1b[1m=== Analysis ===\x1b[0m')
    const warnings: string[] = []
    if (!preview.title) warnings.push('❌ Missing <title>')
    else if (preview.title.length > 60) warnings.push('⚠️  Title > 60 chars (might truncate)')

    if (!preview.description) warnings.push('❌ Missing meta description')
    else if (preview.description.length > 160)
      warnings.push('⚠️  Description > 160 chars (might truncate)')

    if (!preview.og?.image) warnings.push('⚠️  Missing OpenGraph Image')

    if (warnings.length > 0) {
      for (const w of warnings) {
        console.log(w)
      }
    } else {
      console.log('✅ Basic meta tags look good!')
    }
  } catch (e: any) {
    console.error(`\x1b[31mError: ${e.message}\x1b[0m`)
    process.exit(1)
  }
}

async function repairStorage() {
  const { JsonlLogger } = await import('./storage/JsonlLogger')
  const { Compactor } = await import('./storage/Compactor')

  // Search for storage in common places or from config
  // For now, look for sitemap.ops.jsonl in ./storage/seo (default)
  const logPath = join(process.cwd(), 'storage', 'seo', 'sitemap.ops.jsonl')
  if (existsSync(logPath)) {
    console.log(`🛠️  Repairing WAL at ${logPath}...`)
    const logger = new JsonlLogger(logPath)
    const compactor = new Compactor(logger)
    const corruptedCount = await compactor.repairLogs()

    if (corruptedCount > 0) {
      console.log(`✅ Fixed! Removed ${corruptedCount} corrupted entries.`)
    } else {
      console.log('✨ No corruption detected in WAL.')
    }
  } else {
    console.log('No WAL found at ./storage/seo/sitemap.ops.jsonl')
  }
}

async function showStats() {
  // Try to find .luminosity directory in CWD
  const metaPath = join(process.cwd(), '.luminosity', 'meta.json')
  if (existsSync(metaPath)) {
    try {
      const meta = JSON.parse(readFileSync(metaPath, 'utf-8'))
      console.log('┌  Luminosity Status')
      console.log(`│  Last Update:  ${meta.lastUpdate}`)
      console.log(`│  Total URLs:   ${meta.urls || 'Unknown'}`)
      console.log('└  Ready.')
    } catch (e) {
      console.error('Error reading stats:', e)
    }
  } else {
    console.log('No .luminosity index found in current directory.')
  }
}

main().catch(console.error)
