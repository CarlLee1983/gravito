import { createWorkflow } from '@gravito/flux'

/**
 * Saga Patterns: Travel Reservation Systems
 * This workflow demonstrates:
 * 1. Distributed transactions (Flight -> Hotel -> Car)
 * 2. Dependency-based logic
 * 3. Manual Approval / Pausing logic
 * 4. Compensation design patterns (Saga)
 */

export interface TravelInput {
  userId: string
  destination: string
  budget: number
  isPremium: boolean
}

export interface TravelData {
  flightId?: string
  hotelId?: string
  carRentalId?: string
  approvalNeeded: boolean
  approved: boolean
  totalCost: number
  compensations: string[]
  errorSource?: string
  [key: string]: any
}

/**
 * Mock Services
 */
const flightService = {
  async book() {
    return `FLIGHT-${Math.random().toString(36).substring(7).toUpperCase()}`
  },
  async cancel(id: string) {
    console.log(`[Compensate] Flight ${id} canceled.`)
  },
}

const hotelService = {
  async book(city: string) {
    if (city === 'FAIL_CITY') throw new Error('No hotels available in this region.')
    return `HOTEL-${city.toUpperCase()}-${Math.random().toString(36).substring(7).toUpperCase()}`
  },
  async cancel(id: string) {
    console.log(`[Compensate] Hotel ${id} canceled.`)
  },
}

const carService = {
  async book(premium: boolean) {
    // Simulate a failure to trigger the Saga compensation chain
    throw new Error('Car Rental System Outage')
  },
}

export const sagaTravelWorkflow = createWorkflow('saga-travel-reservation')
  .input<TravelInput>()
  .data<TravelData>()
  .step('book-flight', async (ctx) => {
    console.log('✈️  Booking Flight...')
    ctx.data.flightId = await flightService.book()
    ctx.data.totalCost = (ctx.data.totalCost || 0) + 800
    ctx.data.compensations = [...(ctx.data.compensations || []), 'cancel-flight']
  })
  .step('book-hotel', async (ctx) => {
    console.log('🏨 Booking Hotel...')
    try {
      ctx.data.hotelId = await hotelService.book(ctx.input.destination)
      ctx.data.totalCost += 1200
      ctx.data.compensations.push('cancel-hotel')
    } catch (err) {
      ctx.data.errorSource = 'hotel'
      throw err // This will trigger the overall workflow failure
    }
  })
  .step('risk-check-approval', (ctx) => {
    // If budget > 1500, we need approval
    if (ctx.data.totalCost > 1500 && !ctx.data.approved) {
      console.log('⚠️  Budget exceeds $1500. Pausing for human approval...')
      ctx.data.approvalNeeded = true
      // In a real system, we'd persist this and wait for an external 'resume' with ctx.data.approved = true
      // For this demo, we'll throw a specific error to simulate a pause
      throw new Error('AWAITING_APPROVAL')
    }
  })
  .step('book-car', async (ctx) => {
    console.log('🚗 Booking Car Rental...')
    try {
      ctx.data.carRentalId = await carService.book(ctx.input.isPremium)
      ctx.data.totalCost += 300
    } catch (err) {
      ctx.data.errorSource = 'car'
      throw err
    }
  })
  /**
   * INVERSE STEP LOGIC (SIMULATED SAGA)
   * These steps only run if the workflow has specific markers in data and reaches this logic
   * Note: In a production Saga engine, these would be separate "Undo" handlers.
   * Here we demonstrate how to use 'when' to handle cleanup if we detect failure in later steps.
   */
  .step(
    'saga-compensation-executor',
    async (ctx) => {
      // This step is reached only if we are in a "cleanup" mode or after a manually resumed failure
      // However, since standard Flux failure stops execution,
      // real Saga patterns usually involve a SECOND workflow or a specific catch-and-resume logic.
      console.log('🛡️  Executing Saga Compensation...')

      if (ctx.data.compensations.includes('cancel-hotel') && ctx.data.hotelId) {
        await hotelService.cancel(ctx.data.hotelId)
      }
      if (ctx.data.compensations.includes('cancel-flight') && ctx.data.flightId) {
        await flightService.cancel(ctx.data.flightId)
      }
    },
    {
      // This logic would normally be triggered by a "Recovery" script that resumes a failed workflow
      // but points it to this specific compensation step.
      when: (ctx) => ctx.data.triggerCompensation === true,
    }
  )
  .commit('finalize-itinerary', (ctx) => {
    console.log('✅ Itinerary finalized!')
  })
  .build()

export default sagaTravelWorkflow
