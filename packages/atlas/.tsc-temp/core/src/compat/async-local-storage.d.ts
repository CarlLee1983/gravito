/**
 * Universal AsyncLocalStorage wrapper.
 * Automatically switches between node:async_hooks and a browser mock.
 */
export declare const AsyncLocalStorage: {
  new <_T>(): any
}
