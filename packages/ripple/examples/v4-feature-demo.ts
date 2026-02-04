/**
 * Ripple v4.0 Feature Demo
 * 
 * This example demonstrates:
 * 1. NATS Driver configuration
 * 2. Custom Message Interceptors (Middleware)
 * 3. Client-side Interceptors
 * 4. ACK confirming
 */

import { RippleServer } from '../src/RippleServer';
import { RippleClient } from '../../ripple-client/src/RippleClient';

// 1. Setup Server with NATS and Interceptors
const server = new RippleServer({
    driver: 'nats',
    nats: {
        servers: 'nats://localhost:4222',
    },
    interceptors: [
        // Logging Interceptor
        async (ctx, next) => {
            console.log(`[Server] Incoming ${ctx.direction} message: ${ctx.message.type}`);
            const start = Date.now();

            await next();

            console.log(`[Server] Processed in ${Date.now() - start}ms`);
        },
        // Data Masking Interceptor (Outgoing)
        async (ctx, next) => {
            if (ctx.direction === 'outgoing' && ctx.message.type === 'event') {
                const msg = ctx.message as any;
                if (msg.data && msg.data.password) {
                    msg.data.password = '********';
                    console.log('[Server] Masked sensitive data in outgoing message');
                }
            }
            await next();
        }
    ]
});

// 2. Setup Client with Interceptors
const client = new RippleClient({
    host: 'ws://localhost:3000/ws',
});

client.use(async (ctx, next) => {
    console.log(`[Client] Intercepted ${ctx.direction} message`);
    await next();
});

// 3. Demo logic (Usage illustration)
console.log('--- Ripple v4.0 Demo Started ---');

// Mocking a server broadcast with ACK
// server.to('orders').emit('paid', { id: 'ORD-123', amount: 99.99 }, { needAck: true });

// Mocking a sensitive data broadcast
// server.broadcast('chat', 'message', { user: 'carl', password: 'secret_password' });

console.log('Demo configuration complete. Check README for how to run.');
