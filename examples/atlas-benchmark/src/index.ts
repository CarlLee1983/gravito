import { setupDB } from './config.js'
import { runMemoryScenario } from './scenarios/memory.js'
import { runFeaturesScenario } from './scenarios/features.js'
import { runPerformanceScenario } from './scenarios/performance.js'
import { DB } from '@gravito/atlas'

async function main() {
  console.log('🚀 Atlas Benchmark Suite')
  console.log('=================================')

  const drivers = ['sqlite', 'postgres', 'mysql', 'mariadb'] as const

  for (const driver of drivers) {
    console.log(`\n\n🔹 TARGET DRIVER: [${driver.toUpperCase()}]`)
    console.log('=================================')
    
    try {
        // Clear previous connection instance to prevent cross-driver contamination
        DB.purge('default')
        setupDB(driver)
        
        // 1. Feature Parity
        await runFeaturesScenario()

        // 2. Performance (Throughput)
        await runPerformanceScenario()

        // 3. Memory Safety
        await runMemoryScenario()

    } catch (e: any) {
        console.error(`❌ Driver [${driver}] Failed:`, e.message)
        if (e.message.includes('not yet implemented')) {
            console.warn('   (Skipping unimplemented driver)')
        } else {
            // console.error(e) // Keep concise unless debug
        }
    } finally {
        await DB.disconnectAll()
    }
  }
}

main()