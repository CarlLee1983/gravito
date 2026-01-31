#!/usr/bin/env node
import { Command } from 'commander'

import { version } from '../package.json'
import { analyzeCommand } from '../src/commands/analyze'
import { compactCommand } from '../src/commands/compact'
import { generateCommand } from '../src/commands/generate'
import { initCommand } from '../src/commands/init'
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

program.parse()
