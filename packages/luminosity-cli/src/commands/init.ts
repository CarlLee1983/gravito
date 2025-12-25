import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { stdin as input, stdout as output } from 'node:process'
import * as readline from 'node:readline/promises'
import pc from 'picocolors'

const TEMPLATE = `import type { SeoConfig } from '@gravito/luminosity'

const config: SeoConfig = {
  mode: '__MODE__',
  baseUrl: '__BASE_URL__',
  resolvers: [
    // Example Resolver
    {
      name: 'static-pages',
      fetch: () => [
        { url: '/', changefreq: 'daily', priority: 1.0 },
        { url: '/about', changefreq: 'monthly', priority: 0.8 },
      ]
    }
  ],
  // output: {
  //   path: './public',
  //   filename: 'sitemap.xml'
  // }
}

export default config
`

export async function initCommand() {
  const rl = readline.createInterface({ input, output })

  console.log(pc.bold('\n🚀 Initialize Gravito SEO\n'))

  // 1. Base URL
  const baseUrl = await rl.question(
    `${pc.green('?')} What is your website Base URL? (e.g. https://example.com): `
  )
  const cleanUrl = baseUrl.trim().replace(/\/$/, '')

  // 2. Mode
  console.log('\nChoose operating mode:')
  console.log(`  ${pc.cyan('1. Dynamic')}     (Best for dev / small apps)`)
  console.log(`  ${pc.cyan('2. Cached')}      (Standard production)`)
  console.log(`  ${pc.cyan('3. Incremental')} (Large scale / Legacy integration)`)

  const modeChoice = await rl.question(`${pc.green('?')} Select mode [1-3] (default: 2): `)

  let mode: 'dynamic' | 'cached' | 'incremental' = 'cached'
  if (modeChoice.trim() === '1') {
    mode = 'dynamic'
  }
  if (modeChoice.trim() === '3') {
    mode = 'incremental'
  }

  const configContent = TEMPLATE.replace('__BASE_URL__', cleanUrl || 'https://example.com').replace(
    '__MODE__',
    mode
  )

  const targetFile = join(process.cwd(), 'gravito.seo.config.ts')

  if (existsSync(targetFile)) {
    console.log(pc.red(`\n❌ Config file already exists at ${targetFile}`))
    rl.close()
    process.exit(1)
  }

  await writeFile(targetFile, configContent)

  console.log(pc.green(`\n✅ Generated gravito.seo.config.ts`))
  console.log(pc.dim(`   Mode: ${mode}`))
  console.log(pc.dim(`   BaseURL: ${cleanUrl}`))
  console.log(`\nNext steps:`)
  console.log(`  1. Edit ${pc.cyan('gravito.seo.config.ts')} to add real resolvers.`)
  console.log(`  2. Mount middleware in your Photon/Express app.\n`)

  rl.close()
}
