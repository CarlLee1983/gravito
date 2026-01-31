// Export all validation components
export * from './SchemaValidator'
export * from './ValibotValidator'
export * from './ZodValidator'

import { SchemaCache } from '../core/SchemaCache'
// Initialize default validators
import { SchemaValidatorFactory } from './SchemaValidator'
import { ValibotValidator } from './ValibotValidator'
import { ZodValidator } from './ZodValidator'

// Register default validators
SchemaValidatorFactory.register(new ZodValidator())
SchemaValidatorFactory.register(new ValibotValidator())

// Initialize SchemaCache with registered validators for performance optimization
SchemaCache.registerValidators(SchemaValidatorFactory.getValidators())
