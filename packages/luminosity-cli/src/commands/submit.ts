import {
  BingSubmitter,
  type BingSubmitterConfig,
  ConfigLoader,
  GoogleSubmitter,
  type GoogleSubmitterConfig,
  IncrementalStrategy,
  SeoEngine,
} from '@gravito/luminosity'
import pc from 'picocolors'

/**
 * Dependencies for the `submit` command.
 *
 * @public
 * @since 3.1.0
 */
export interface SubmitCommandDeps {
  ConfigLoader?: typeof ConfigLoader
  SeoEngine?: typeof SeoEngine
  GoogleSubmitter?: typeof GoogleSubmitter
  BingSubmitter?: typeof BingSubmitter
}

/**
 * Submit command options.
 *
 * @public
 * @since 3.1.0
 */
export interface SubmitCommandOptions {
  /** Path to configuration file. */
  config?: string
  /** Submit to Google Indexing API. */
  google?: boolean
  /** Submit to Bing IndexNow. */
  bing?: boolean
  /** Google Service Account path. */
  googleServiceAccount?: string
  /** Bing IndexNow API key. */
  bingApiKey?: string
  /** Website host for Bing. */
  bingHost?: string
  /** Limit number of URLs to submit (for testing). */
  limit?: number
  /** Dry run (don't actually submit). */
  dryRun?: boolean
}

/**
 * Submit sitemap URLs to search engines.
 *
 * Reads URLs from the current sitemap and submits them to Google
 * and/or Bing search engines for faster indexing.
 *
 * @param options - Command options
 * @param deps - Injectable dependencies for testing
 *
 * @example
 * ```bash
 * # Submit to both Google and Bing
 * lux submit --google --bing
 *
 * # Submit to Google only
 * lux submit --google --google-service-account=./service-account.json
 *
 * # Submit to Bing only
 * lux submit --bing --bing-api-key=YOUR_KEY --bing-host=example.com
 *
 * # Dry run (test without submitting)
 * lux submit --google --bing --dry-run
 *
 * # Limit URLs (for testing)
 * lux submit --google --limit=10
 * ```
 *
 * @public
 * @since 3.1.0
 */
export async function submitCommand(
  options: SubmitCommandOptions = {},
  deps: SubmitCommandDeps = {}
) {
  try {
    // Validate options
    if (!options.google && !options.bing) {
      console.error(pc.red('\n❌ Error: Specify at least one search engine (--google or --bing)'))
      console.log(pc.dim('\nExamples:'))
      console.log(pc.dim('  lux submit --google'))
      console.log(pc.dim('  lux submit --bing'))
      console.log(pc.dim('  lux submit --google --bing\n'))
      process.exit(1)
    }

    const ConfigLoaderImpl = deps.ConfigLoader ?? ConfigLoader
    const SeoEngineImpl = deps.SeoEngine ?? SeoEngine

    console.log(pc.dim('Loading configuration...'))
    const loader = new ConfigLoaderImpl()
    const config = await loader.load(options.config)

    console.log(pc.dim('Initializing engine...'))
    const engine = new SeoEngineImpl(config)
    await engine.init()

    console.log(pc.cyan('📡 Fetching sitemap URLs...'))
    const entries = await engine.getEntries()

    if (entries.length === 0) {
      console.log(pc.yellow('\n⚠️  No URLs found in sitemap.'))
      return
    }

    // Apply limit if specified
    const urlsToSubmit = options.limit ? entries.slice(0, options.limit) : entries
    const urls = urlsToSubmit.map((entry) => entry.url)

    console.log(pc.cyan(`Found ${pc.bold(entries.length)} URLs in sitemap`))
    if (options.limit) {
      console.log(pc.yellow(`Limiting to ${pc.bold(options.limit)} URLs (--limit flag)`))
    }

    if (options.dryRun) {
      console.log(pc.yellow('\n🔍 DRY RUN MODE (not actually submitting)\n'))
    }

    // Submit to Google
    if (options.google) {
      await submitToGoogle(urls, options, deps)
    }

    // Submit to Bing
    if (options.bing) {
      await submitToBing(urls, options, deps)
    }

    console.log(pc.green('\n✅ Submission complete!\n'))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(pc.red('\n❌ Submission failed:'), message)
    process.exit(1)
  }
}

/**
 * Submit URLs to Google Indexing API.
 * @private
 */
async function submitToGoogle(
  urls: string[],
  options: SubmitCommandOptions,
  deps: SubmitCommandDeps
) {
  console.log(pc.cyan('\n📤 Submitting to Google Indexing API...'))

  if (options.dryRun) {
    console.log(pc.dim(`Would submit ${urls.length} URLs to Google`))
    return
  }

  if (!options.googleServiceAccount) {
    console.error(pc.red('❌ Error: --google-service-account is required for Google submission'))
    console.log(pc.dim('   Get credentials at: https://console.cloud.google.com/'))
    process.exit(1)
  }

  const GoogleSubmitterImpl = deps.GoogleSubmitter ?? GoogleSubmitter

  const googleConfig: GoogleSubmitterConfig = {
    serviceAccountPath: options.googleServiceAccount,
    rateLimit: {
      requestsPerSecond: 2, // Conservative rate limit
    },
  }

  const submitter = new GoogleSubmitterImpl(googleConfig)

  try {
    await submitter.init()
  } catch (error) {
    console.error(pc.red('❌ Failed to initialize Google submitter:'), error)
    return
  }

  console.log(pc.dim('Submitting URLs (this may take a while)...'))

  const results = await submitter.submitBatch(urls, 'URL_UPDATED')
  const successCount = results.filter((r) => r.success).length
  const failCount = results.length - successCount

  if (successCount > 0) {
    console.log(pc.green(`✅ Successfully submitted ${successCount} URLs to Google`))
  }

  if (failCount > 0) {
    console.log(pc.red(`❌ Failed to submit ${failCount} URLs to Google`))

    // Show first few errors
    const errors = results.filter((r) => !r.success).slice(0, 3)
    for (const error of errors) {
      console.log(pc.dim(`   ${error.url}: ${error.error}`))
    }

    if (failCount > 3) {
      console.log(pc.dim(`   ... and ${failCount - 3} more errors`))
    }
  }
}

/**
 * Submit URLs to Bing IndexNow.
 * @private
 */
async function submitToBing(
  urls: string[],
  options: SubmitCommandOptions,
  deps: SubmitCommandDeps
) {
  console.log(pc.cyan('\n📤 Submitting to Bing IndexNow...'))

  if (options.dryRun) {
    console.log(pc.dim(`Would submit ${urls.length} URLs to Bing`))
    return
  }

  if (!options.bingApiKey || !options.bingHost) {
    console.error(
      pc.red('❌ Error: --bing-api-key and --bing-host are required for Bing submission')
    )
    console.log(pc.dim('   Get API key at: https://www.bing.com/indexnow'))
    process.exit(1)
  }

  const BingSubmitterImpl = deps.BingSubmitter ?? BingSubmitter

  const bingConfig: BingSubmitterConfig = {
    apiKey: options.bingApiKey,
    host: options.bingHost,
    rateLimit: {
      requestsPerSecond: 1, // Conservative rate limit
    },
  }

  const submitter = new BingSubmitterImpl(bingConfig)

  console.log(pc.dim('Submitting URLs...'))

  const result = await submitter.submitUrls(urls)

  if (result.success) {
    console.log(pc.green(`✅ Successfully submitted ${result.urlCount} URLs to Bing`))
  } else {
    console.log(pc.red(`❌ Failed to submit to Bing: ${result.error}`))
  }
}
