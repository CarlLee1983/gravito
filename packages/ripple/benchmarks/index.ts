#!/usr/bin/env bun

console.log('🚀 Running Ripple Performance Benchmarks\n')

console.log('='.repeat(60))
console.log('1️⃣  Serialization Benchmarks')
console.log('='.repeat(60))
await import('./serialization.bench')

console.log('\n')
console.log('='.repeat(60))
console.log('2️⃣  Broadcast Benchmarks')
console.log('='.repeat(60))
await import('./broadcast.bench')

console.log('\n')
console.log('✅ All benchmarks completed!')

export {}
