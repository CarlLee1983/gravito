/**
 * @gravito/xenon - Safe FFI Wrapper
 * Secure native library bindings with memory management
 */

// Errors
export {
  XenonConfigError,
  XenonError,
  XenonLibraryError,
  XenonMemoryError,
  XenonSecurityError,
  XenonTypeError,
} from './errors'
export { createMockHandle, LibraryHandleImpl } from './library/LibraryHandle'
export type { FFILoader } from './library/LibraryLoader'
// Library handling
export { LibraryLoader } from './library/LibraryLoader'
export {
  createBorrowedBuffer,
  createOwnedBuffer,
  getBufferInfo,
  isBorrowed,
  isFreed,
  isOwned,
  markFreed,
} from './memory/BufferOwnership'
// Memory management
export { MemoryTracker } from './memory/MemoryTracker'
export type { OrbitXenonConfig } from './OrbitXenon'
export { OrbitXenon } from './OrbitXenon'
export {
  alignSize,
  checkAlignment,
  checkBounds,
  isValidPointer,
  validateBounds,
} from './safety/BoundsChecker'
// Safety
export {
  validateSymbolDef,
  validateSymbols,
  validateType,
} from './safety/TypeGuard'
// Types
export type {
  BoundsCheckResult,
  BufferOwnership,
  FFISymbolDef,
  FFISymbols,
  FFIType,
  LibraryHandle,
  LibraryLoaderConfig,
  ManagedBuffer,
  MemoryStats,
  TypeValidationResult,
  XenonConfig,
  XenonManagerConfig,
} from './types'
export { Xenon } from './Xenon'
// Core classes
export { XenonManager } from './XenonManager'
