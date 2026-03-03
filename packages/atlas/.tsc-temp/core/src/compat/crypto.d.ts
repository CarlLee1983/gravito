/**
 * Universal Crypto wrapper.
 * Automatically switches between node:crypto and globalThis.crypto.
 */
export declare const randomUUID: () => string
export declare const randomBytes: (size: number) => any
