#!/usr/bin/env node
import { Command } from 'commander'

import { version } from '../package.json'
import { analyzeCommand } from '../src/commands/analyze'
import { compactCommand } from '../src/commands/compact'
import { generateCommand } from '../src/commands/generate'
import { initCommand } from '../src/commands/init'
import { submitCommand } from '../src/commands/submit'
import { showLogo } from '../src/ui/logo'

const program = new Command()

program.name('gravito-seo').description('CLI for Gravito SmartMap Engine').version(version)

program
  .command('init')
  .description('Initialize Gravito SEO configuration')
  .action(async () => {
    showLogo()
    await initCommand()
  })

program
  .command('generate')
  .description('Generate sitemap.xml to file')
  .option('-c, --config <path>', 'Path to config file')
  .option('-o, --out <path>', 'Output path (e.g. ./public/sitemap.xml)')
  .action(async (options) => {
    await generateCommand(options)
  })

program
  .command('compact')
  .description('Force compaction of incremental logs')
  .option('-c, --config <path>', 'Path to config file')
  .action(async (options) => {
    await compactCommand(options)
  })

program
  .command('analyze')
  .description('Analyze WAL log health and provide recommendations')
  .option('-c, --config <path>', 'Path to config file')
  .option('-v, --verbose', 'Show verbose output')
  .action(async (options) => {
    await analyzeCommand(options)
  })

program
  .command('submit')
  .description('Submit sitemap URLs to search engines')
  .option('-c, --config <path>', 'Path to config file')
  .option('--google', 'Submit to Google Indexing API')
  .option('--bing', 'Submit to Bing IndexNow')
  .option('--google-service-account <path>', 'Path to Google Service Account JSON')
  .option('--bing-api-key <key>', 'Bing IndexNow API key')
  .option('--bing-host <host>', 'Website host for Bing (e.g., example.com)')
  .option('--limit <number>', 'Limit number of URLs to submit', parseInt)
  .option('--dry-run', 'Test without actually submitting')
  .action(async (options) => {
    await submitCommand(options)
  })

program.parse()
