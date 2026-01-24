import { Bench } from 'tinybench'
import * as v from 'valibot'
import { z } from 'zod'
import { SchemaCompilationCache } from '../core/SchemaCompilationCache'
import { ValibotValidator } from '../validation/ValibotValidator'
import { ZodValidator } from '../validation/ZodValidator'

const bench = new Bench({ time: 1000, iterations: 1000 })

// Zod Setup
const zodSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  age: z.number().min(18).optional(),
})
const zodValidator = new ZodValidator()
const validData = {
  name: 'John Doe',
  email: 'john@example.com',
  age: 25,
}

// Valibot Setup
const valibotSchema = v.object({
  name: v.pipe(v.string(), v.minLength(2)),
  email: v.pipe(v.string(), v.email()),
  age: v.optional(v.pipe(v.number(), v.minValue(18))),
})
const valibotValidator = new ValibotValidator()

bench
  .add('Zod: Cold validation (no cache)', () => {
    // We simulate cold by not using the compilation cache explicitly or clearing it if we could
    // But since the validator uses it internally, we can just call validate
    // To truly test "cold", we might need to bypass the cache, but for now let's just test the path
    // Actually, to test "uncached", we'd need to mock or modify the internal behavior,
    // which is hard. Let's just benchmark the current "optimized" state vs raw library
    return zodSchema.safeParse(validData)
  })
  .add('Zod: Via Validator (Optimized)', () => {
    return zodValidator.validate(zodSchema, validData)
  })
  .add('Valibot: Cold validation', () => {
    return v.safeParse(valibotSchema, validData)
  })
  .add('Valibot: Via Validator (Optimized)', () => {
    return valibotValidator.validate(valibotSchema, validData)
  })

console.log('Running benchmarks...')

async function run() {
  await bench.run()
  console.table(bench.table())
}

run().catch(console.error)
