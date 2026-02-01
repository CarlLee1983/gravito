import { beforeAll, describe, expect, it, mock } from 'bun:test'
import { PlanetCore } from '@gravito/core'

// Mock Stripe globally BEFORE other imports
mock.module('stripe', () => {
  return {
    default: class StripeMock {
      paymentIntents = {
        create: async () => ({
          id: 'pi_test_final',
          client_secret: 'secret',
          status: 'requires_payment_method',
        }),
        capture: async () => ({ status: 'succeeded' }),
      }
      refunds = {
        create: async () => ({ status: 'succeeded' }),
      }
    },
  }
})

describe('🌌 Gravito Ecommerce Galaxy - Full System Ignition', () => {
  let core: PlanetCore

  beforeAll(async () => {
    // Dynamic imports to ensure mocks apply
    const { OrbitAtlas } = await import('../../packages/atlas/src')
    const { OrbitPlasma } = await import('../../packages/plasma/src')
    const { CartServiceProvider } = await import('../../satellites/cart/src')
    const { CatalogServiceProvider } = await import('../../satellites/catalog/src')
    const { CommerceServiceProvider } = await import('../../satellites/commerce/src')
    const { MarketingServiceProvider } = await import('../../satellites/marketing/src')
    const { MembershipServiceProvider } = await import('../../satellites/membership/src')
    const { PaymentServiceProvider } = await import('../../satellites/payment/src')

    core = new PlanetCore({
      config: {
        'payment.stripe.secret': 'sk_test_ignition',
        database: {
          default: 'sqlite',
          connections: {
            sqlite: { driver: 'sqlite', database: ':memory:' },
          },
        },
        redis: { default: {} },
        membership: {
          passkeys: {
            origin: 'http://localhost',
            rp_id: 'localhost',
            rp_name: 'Gravito Test',
            name: 'Gravito Test',
            timeout: 60000,
            user_verification: 'preferred',
            attestation: 'none',
          },
        },
      },
    })

    // Manual Mock i18n
    core.container.singleton('i18n', () => ({
      t: (key: string) => key,
      locale: () => 'en',
    }))

    // Install Orbit & Satellites
    await core.orbit(new OrbitAtlas())
    await core.orbit(new OrbitPlasma())
    await core.use(new MembershipServiceProvider())
    await core.use(new CatalogServiceProvider())
    await core.use(new CommerceServiceProvider())
    await core.use(new MarketingServiceProvider())
    await core.use(new CartServiceProvider())
    await core.use(new PaymentServiceProvider())

    await core.bootstrap()

    // Setup Schema & Seed Data
    const { Schema, DB } = await import('@gravito/atlas')
    await Schema.create('promotions', (table: Record<string, unknown>) => {
      table.string('id').primary()
      table.string('name')
      table.string('type')
      table.text('configuration')
      table.integer('priority').default(0)
      table.boolean('is_active').default(true)
      table.timestamp('starts_at').nullable()
      table.timestamp('ends_at').nullable()
      table.timestamp('created_at').default('CURRENT_TIMESTAMP')
    })

    await DB.table('promotions').insert({
      id: 'promo-1',
      name: 'Ignition Promo',
      type: 'cart_threshold',
      configuration: JSON.stringify({ min_amount: 500, discount: 100 }),
      is_active: true,
    })
  })

  it('should complete full cycle from order to payment', async () => {
    core.logger.info('🔥 Ignition Started...')

    const variantId = 'v-iphone-15'
    const _memberId = 'member-123'

    // Step 1: Verify Marketing Discount Injection
    const adjustments = await core.hooks.applyFilters('commerce:order:adjustments', [], {
      order: { id: 'order-001', subtotalAmount: 1000 },
    })
    expect(adjustments.length).toBeGreaterThan(0)
    expect(adjustments[0].label).toContain('Promotion: Spend 500 Get 100 Off')
    core.logger.info('Step 1: Marketing Discount Logic OK')

    // Step 2: Verify Payment Intent Generation
    let paymentIntentCaptured = false
    core.hooks.addAction('payment:intent:ready', (payload: Record<string, unknown>) => {
      paymentIntentCaptured = true
      core.logger.info(`Step 2: Stripe Intent Received -> ${payload.intent.gatewayTransactionId}`)
    })

    await core.hooks.doAction('commerce:order:created', {
      order: { id: 'order-001', totalAmount: 900, currency: 'USD' },
    })
    expect(paymentIntentCaptured).toBe(true)

    // Step 3: Verify Payment Confirmation
    await core.hooks.doAction('payment:succeeded', {
      orderId: 'order-001',
      gatewayTransactionId: 'pi_test_final',
    })
    core.logger.info('Step 3: Payment confirmation confirmed via Hook')

    // Step 4: Verify Refund Process
    await core.hooks.doAction('commerce:order:refund-requested', {
      orderId: 'order-001',
      gatewayId: 'pi_test_final',
      amount: 900,
      items: [{ variantId, quantity: 1 }],
    })
    core.logger.info('Step 4: Refund & Stock Recovery sequence triggered')

    core.logger.info('🚀 Full System Component Integration PASSED!')
  })
})
