/**
 * 基礎應用配置
 */
export default {
  basePath: process.cwd(),
  port: parseInt(process.env.HTTP_PORT || '3000', 10),

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
  },

  middleware: {
    global: ['cors', 'logging', 'errorHandler'],
    rateLimiter: {
      enabled: true,
      windowMs: 60000,
      maxRequests: 100,
      endpoints: {
        '/api/orders': 10,
      },
    },
  },

  flashSale: {
    lockTimeoutSeconds: 15 * 60,
    lockRetries: 3,
    paymentTimeoutMinutes: 30,
    queue: {
      paymentProcessing: 'payment-processing',
      inventoryDeduction: 'inventory-deduction',
      orderConfirmation: 'order-confirmation',
      analytics: 'analytics-events',
      retry: {
        attempts: 3,
        backoff: 5000,
      },
    },
  },
}
