import { PlanetCore } from '@gravito/core'
import { OrbitHorizon } from '@gravito/horizon'

console.log('--- @gravito/horizon v3.1.0 Validation & Feature Demo ---')

const core = await PlanetCore.boot({
  config: {
    scheduler: {
      lock: { driver: 'memory' },
    },
  },
  orbits: [new OrbitHorizon()],
})
const scheduler = core.container.make<any>('scheduler')

const demoValidation = (label: string, shouldFail: boolean, action: () => void) => {
  process.stdout.write(`[Validation] Testing ${label.padEnd(35)} `)
  try {
    action()
    if (shouldFail) {
      console.log("🔴 FAILED: Should have thrown error but didn't.")
    } else {
      console.log('✅ PASSED: Accepted as valid.')
    }
  } catch (e: any) {
    if (shouldFail) {
      console.log(`✅ PASSED: Caught expected error -> "${e.message}"`)
    } else {
      console.log(`🔴 FAILED: Unexpected error -> "${e.message}"`)
    }
  }
}

console.log('\n--- P1: Strict Time Validation ---')

demoValidation('Invalid Time (.at("25:00"))', true, () => {
  scheduler.task('bad-time', () => {}).at('25:00')
})

demoValidation('Invalid Format (.at("9:00"))', true, () => {
  scheduler.task('bad-format', () => {}).at('9:00')
})

demoValidation('Valid Time (.at("14:30"))', false, () => {
  scheduler.task('good-time', () => {}).at('14:30')
})

demoValidation('Invalid Weekly (.weeklyOn(8, ...))', true, () => {
  scheduler.task('bad-week', () => {}).weeklyOn(8, '12:00')
})

console.log('\n--- P2: Cron & Timezone Validation ---')

demoValidation('Invalid Cron (.cron("invalid"))', true, () => {
  scheduler.task('bad-cron', () => {}).cron('invalid string')
})

demoValidation('Valid Cron (.cron("*/5 * * * *"))', false, () => {
  scheduler.task('good-cron', () => {}).cron('*/5 * * * *')
})

demoValidation('Invalid Timezone', true, () => {
  scheduler
    .task('bad-tz', () => {})
    .everyMinute()
    .timezone('Mars/Colony')
})

demoValidation('Valid Timezone', false, () => {
  scheduler
    .task('good-tz', () => {})
    .everyMinute()
    .timezone('Asia/Taipei')
})

console.log('\n--- P2: Timeout Configuration ---')

demoValidation('Set Timeout (.timeout(5000))', false, () => {
  scheduler
    .task('timeout-task', async () => {
      await new Promise((r) => setTimeout(r, 10000))
    })
    .everyMinute()
    .timeout(5000)
})

console.log('\n--- P3: Retry Mechanism ---')

demoValidation('Set Retry (.retry(3, 1000))', false, () => {
  scheduler
    .task('retry-task', async () => {
      throw new Error('Planned failure')
    })
    .everyMinute()
    .retry(3, 1000)
})

console.log('\n--- Demo Complete ---')
process.exit(0)
