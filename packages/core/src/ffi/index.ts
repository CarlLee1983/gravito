/**
 * FFI (Foreign Function Interface) 模組導出
 * 提供原生 C 加速層支持
 */

// 內部測試用導出
export { CborFallbackDecoder, CborFallbackEncoder } from './cbor-fallback'
export { NativeAccelerator } from './NativeAccelerator'
export type {
  CborAccelerator,
  FfiConfig,
  NativeAcceleratorStatus,
} from './types'
export {
  CBOR_LENGTH_ENCODING,
  CBOR_MAJOR_TYPES,
  CBOR_SIMPLE_VALUES,
} from './types'
