/**
 * @gravito/scaffold
 *
 * Project scaffolding engine for Gravito Framework.
 * Generate enterprise-grade architecture templates with CLI support.
 *
 * @packageDocumentation
 */

export * from './EnvironmentDetector'
// Main API
// Core Logic
export * from './FileMerger'
// Generators
export {
  BaseGenerator,
  type GeneratorConfig,
  type GeneratorContext,
} from './generators/BaseGenerator'
export { CleanArchitectureGenerator } from './generators/CleanArchitectureGenerator'
export { DddGenerator } from './generators/DddGenerator'
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
