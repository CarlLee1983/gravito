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
    default:
      console.log('Usage: lux <command> [options]')
      console.log('Commands: generate, stats, warm, init, repair')
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
