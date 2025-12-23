import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { ConfigLoader, SeoEngine, XmlStreamBuilder } from '@gravito/luminosity'
import pc from 'picocolors'

export interface GenerateCommandOptions {
  config?: string
  out?: string
  background?: boolean
  async?: boolean
  incremental?: boolean
  since?: string
}

/**
 * Improved generate command.
 * Supports background mode, streaming processing, and incremental generation.
 *
 * @param options - Generation options.
 */
export async function generateCommand(options: GenerateCommandOptions) {
  try {
    const loader = new ConfigLoader()
    const config = await loader.load(options.config)

    // Override output path if CLI arg provided
    const outputPath = options.out
      ? options.out
      : config.output?.path
        ? join(config.output.path, config.output.filename || 'sitemap.xml')
        : 'sitemap.xml'

    // Background mode processing
    if (options.background || options.async) {
      console.log(pc.yellow('⚠️  Background mode is not yet fully implemented in seo-cli'))
      console.log(pc.dim('   Consider using OrbitSitemap.generateAsync() in your application'))
      // This can be integrated with a queue system
    }

    console.log(pc.dim('Loading engine...'))
    const engine = new SeoEngine(config)
    await engine.init()

    console.log(pc.dim('Fetching entries...'))
    const strategy = engine.getStrategy()

    // Support streaming processing
    const entries = await strategy.getEntries()

    // If it's an AsyncIterable, use streaming processing
    if (entries && typeof (entries as any)[Symbol.asyncIterator] === 'function') {
      await generateFromStream(entries as unknown as AsyncIterable<any>, config, outputPath)
    } else {
      // Array processing (existing logic)
      const entriesArray = Array.isArray(entries) ? entries : []

      console.log(pc.dim(`Generating XML for ${entriesArray.length} URLs...`))
      const builder = new XmlStreamBuilder({
        baseUrl: config.baseUrl,
        branding: config.branding?.enabled,
      })
      const xml = builder.buildFull(entriesArray)

      // Ensure directory exists
      const dir = dirname(outputPath)
      await mkdir(dir, { recursive: true })

      await writeFile(outputPath, xml)

      console.log(pc.green(`\n✅ Sitemap generated at: ${outputPath}`))
      console.log(pc.dim(`   Total URLs: ${entriesArray.length}`))
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(pc.red('\n❌ Generation failed:'), message)
    process.exit(1)
  }
}

/**
 * 從串流生成 sitemap
 */
async function generateFromStream(
  entries: AsyncIterable<any>,
  config: any,
  outputPath: string
): Promise<void> {
  const builder = new XmlStreamBuilder({
    baseUrl: config.baseUrl,
    branding: config.branding?.enabled,
  })

  let xml = builder.start()
  let count = 0
  const batchSize = 1000
  let batch: any[] = []

  console.log(pc.dim('Processing entries in stream...'))

  for await (const entry of entries) {
    batch.push(entry)
    count++

    if (batch.length >= batchSize) {
      for (const e of batch) {
        xml += builder.entry(e)
      }
      batch = []

      // 顯示進度
      if (count % 10000 === 0) {
        process.stdout.write(`\r${pc.dim(`Processed ${count} URLs...`)}`)
      }
    }
  }

  // 處理剩餘的
  for (const e of batch) {
    xml += builder.entry(e)
  }

  xml += builder.end()

  // Ensure directory exists
  const dir = dirname(outputPath)
  await mkdir(dir, { recursive: true })

  await writeFile(outputPath, xml)

  console.log(pc.green(`\n✅ Sitemap generated at: ${outputPath}`))
  console.log(pc.dim(`   Total URLs: ${count}`))
}
