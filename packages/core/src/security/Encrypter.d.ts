export interface EncrypterOptions {
  key: string
  cipher?: string
}
export declare class Encrypter {
  private algorithm
  private key
  constructor(options: EncrypterOptions)
  /**
   * Encrypt a value
   */
  encrypt(value: unknown, serialize?: boolean): string
  /**
   * Decrypt a value
   */
  decrypt(payload: string, deserialize?: boolean): unknown
  private hash
  private validPayload
  private validMac
  /**
   * Generate a new key
   */
  static generateKey(cipher?: string): string
}
//# sourceMappingURL=Encrypter.d.ts.map
