import { createWorkflow, FluxEngine, MemoryStorage } from '../src'

// Define a workflow with compensation logic
const tripBookingWorkflow = createWorkflow('book-trip')
  .input<{ destination: string; amount: number }>()

  // Step 1: Reserve Flight
  .step(
    'reserve-flight',
    async (ctx) => {
      console.log(`[Flux] Reserving flight to ${ctx.input.destination}...`)
      if (ctx.input.destination === 'Mars') {
        throw new Error('No flights to Mars yet!')
      }
      ctx.data.flightId = 'FL-123'
    },
    {
      compensate: async (ctx) => {
        console.log(`[Compensate] Cancelling flight ${ctx.data.flightId}...`)
        ctx.data.flightCancelled = true
      },
    }
  )

  // Step 2: Reserve Hotel (This will fail for demo purposes if amount > 1000)
  .step(
    'reserve-hotel',
    async (ctx) => {
      console.log(`[Flux] Reserving hotel...`)
      if (ctx.input.amount > 1000) {
        throw new Error('Credit limit exceeded for hotel!')
      }
      ctx.data.hotelId = 'HT-456'
    },
    {
      compensate: async (ctx) => {
        console.log(`[Compensate] Cancelling hotel ${ctx.data.hotelId}...`)
        ctx.data.hotelCancelled = true
      },
    }
  )

  // Step 3: Charge Payment
  .step('charge-card', async (ctx) => {
    console.log(`[Flux] Charging card for $${ctx.input.amount}...`)
  })

async function main() {
  const engine = new FluxEngine({
    storage: new MemoryStorage(),
    logger: {
      debug: () => {},
      info: console.log,
      warn: console.warn,
      error: console.error,
    },
  })

  console.log('\n--- Scenario 1: Successful Trip ---')
  const result1 = await engine.execute(tripBookingWorkflow, { destination: 'Tokyo', amount: 500 })
  console.log('Result 1:', result1.status) // Should be completed

  console.log('\n--- Scenario 2: Failure with Rollback ---')
  // This should pass flight reservation, but fail at hotel reservation (amount > 1000)
  // Expect: Flight reservation to be COMPENSATED.
  const result2 = await engine.execute(tripBookingWorkflow, { destination: 'Paris', amount: 2000 })
  console.log('Result 2:', result2.status) // Should be rolled_back
  console.log('Data:', result2.data)

  if (result2.status !== 'rolled_back') {
    throw new Error('Scenario 2 should have rolled back!')
  }
}

main().catch(console.error)
