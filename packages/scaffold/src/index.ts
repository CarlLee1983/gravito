/**
 * @gravito/scaffold
 *
 * Project scaffolding engine for Gravito Framework.
 * Generate enterprise-grade architecture templates with CLI support.
 *
 * @packageDocumentation
 */

// Main API
// Core Logic
export {
  DependencyValidator,
  type PackageJson,
  type ValidationResult,
} from './DependencyValidator'
export * from './EnvironmentDetector'
export * from './FileMerger'
// Generators
export {
  BaseGenerator,
  type GeneratorConfig,
  type GeneratorContext,
} from './generators/BaseGenerator'
export { CleanArchitectureGenerator } from './generators/CleanArchitectureGenerator'
export { DddGenerator, type DddModuleType } from './generators/DddGenerator'
// DDD Sub-generators
export { AdvancedModuleGenerator } from './generators/ddd/AdvancedModuleGenerator'
export { EnterpriseMvcGenerator } from './generators/EnterpriseMvcGenerator'
export { SatelliteGenerator } from './generators/SatelliteGenerator'
// Stub Generator
export { type StubConfig, StubGenerator, type StubVariables } from './generators/StubGenerator'
export { type LockFile, LockGenerator } from './LockGenerator'
export * from './ProfileResolver'
export { type ProfileConfig, ProfileResolver, type ProfileType } from './ProfileResolver'
export { Scaffold } from './Scaffold'
// Types
export type { ArchitectureType, ScaffoldOptions } from './types'
