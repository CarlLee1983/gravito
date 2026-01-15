import { DB } from '@gravito/atlas'
import { setupDB } from './config.js'
import { runFeaturesScenario } from './scenarios/features.js'
import { runMemoryScenario } from './scenarios/memory.js'
import { runPerformanceScenario } from './scenarios/performance.js'

async function main() {
  console.log('🚀 Atlas Benchmark Suite')
  console.log('=================================')

  const drivers = ['sqlite', 'postgres', 'mysql', 'mariadb'] as const
  const modes = [
    { name: 'Standard', useNative: false },
    { name: 'Bun.sql (Native)', useNative: true },
  ]

  for (const driver of drivers) {
    for (const mode of modes) {
      console.log(`\n\n🔹 TARGET DRIVER: [${driver.toUpperCase()}] - MODE: ${mode.name}`)
      console.log('=================================')

      try {
        // Clear previous connection instance to prevent cross-driver contamination
        DB.purge('default')
        setupDB(driver, mode.useNative)

        // 1. Feature Parity
        await runFeaturesScenario()

        // 2. Performance (Throughput)
        await runPerformanceScenario()

        // 3. Memory Safety
        await runMemoryScenario()
      } catch (e: any) {
        console.error(`❌ Driver [${driver}] (${mode.name}) Failed:`, e.message)
        if (e.message.includes('not yet implemented')) {
          console.warn('   (Skipping unimplemented driver)')
        }
      } finally {
        await DB.disconnectAll()
      }
    }
  }
}

main()
