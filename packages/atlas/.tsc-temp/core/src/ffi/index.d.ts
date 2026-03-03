/**
 * FFI (Foreign Function Interface) 模組導出
 * 提供原生加速層支持（CBOR 編碼/解碼、雜湊計算）
 */
export { CborFallbackDecoder, CborFallbackEncoder } from './cbor-fallback'
export { HashFallback } from './hash-fallback'
export { NativeAccelerator } from './NativeAccelerator'
export { NativeHasher } from './NativeHasher'
export type {
  CborAccelerator,
  FfiConfig,
  HashAccelerator,
  NativeAcceleratorStatus,
  NativeHasherStatus,
} from './types'
export { CBOR_LENGTH_ENCODING, CBOR_MAJOR_TYPES, CBOR_SIMPLE_VALUES } from './types'
