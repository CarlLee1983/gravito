import { ConfigLoader, IncrementalStrategy, SeoEngine } from '@gravito/luminosity'
import pc from 'picocolors'

export interface CompactCommandDeps {
  ConfigLoader?: typeof ConfigLoader
  SeoEngine?: typeof SeoEngine
  IncrementalStrategy?: typeof IncrementalStrategy
}

export async function compactCommand(options: { config?: string }, deps: CompactCommandDeps = {}) {
  try {
    const ConfigLoaderImpl = deps.ConfigLoader ?? ConfigLoader
    const SeoEngineImpl = deps.SeoEngine ?? SeoEngine
    const IncrementalStrategyImpl = deps.IncrementalStrategy ?? IncrementalStrategy
    const loader = new ConfigLoaderImpl()
    const config = await loader.load(options.config)

    if (config.mode !== 'incremental') {
      console.error(pc.red('Error: Compact command only works in "incremental" mode.'))
      process.exit(1)
    }

    console.log(pc.dim('Initializing engine...'))
    const engine = new SeoEngineImpl(config)
    // Cast to access specific method not in generic interface, or we should add extra methods to facade?
    // Strong typing suggests we check instance.

    // Engine facade hides it, but for CLI admin tasks we might need direct access.
    // Ideally SeoStrategy has a 'maintenance()' method?
    // Let's rely on internal knowledge or casting for now as it's the official CLI.

    // Actually, I didn't export IncrementalStrategy type fully for casting in the Facade return type easily
    // without importing the class.

    // Let's assume getStrategy returns the specialized one if mode matches.
    const strategy = engine.getStrategy()

    if (strategy instanceof IncrementalStrategyImpl) {
      console.log(pc.cyan('Compacting logs...'))
      await strategy.compact()
      console.log(pc.green('✅ Compaction complete.'))
    } else {
      console.warn(pc.yellow('Strategy is not incremental (runtime mismatch?). Aborting.'))
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(pc.red('\n❌ Compaction failed:'), message)
    process.exit(1)
  }
}
