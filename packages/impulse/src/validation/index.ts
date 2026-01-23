// Export all validation components
export * from './SchemaValidator'
export * from './ValibotValidator'
export * from './ZodValidator'

// Initialize default validators
import { SchemaValidatorFactory } from './SchemaValidator'
import { ValibotValidator } from './ValibotValidator'
import { ZodValidator } from './ZodValidator'

// Register default validators
SchemaValidatorFactory.register(new ZodValidator())
SchemaValidatorFactory.register(new ValibotValidator())
