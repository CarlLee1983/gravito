import type { ClientMessage, ServerMessage } from '../types'

/**
 * Interface for message serialization strategies.
 *
 * Defines how messages are converted between objects and wire format.
 * Supports different serialization formats (e.g., JSON, Protobuf).
 */
export interface ISerializer {
  /** The content type this serializer handles */
  readonly contentType: 'json' | 'protobuf'

  /**
   * Serialize a server message for transmission.
   *
   * @param message - The message to serialize
   * @returns Serialized data (string for text, Buffer/Uint8Array for binary)
   */
  serialize(message: ServerMessage): string | Buffer | Uint8Array

  /**
   * Deserialize a client message from wire format.
   *
   * @param data - The raw data received from the client
   * @returns Parsed ClientMessage object
   */
  deserialize(data: string | Buffer | ArrayBuffer | Uint8Array): ClientMessage

  /**
   * Serialize message for broadcasting with caching optimization.
   *
   * @param message - The message to broadcast
   */
  serializeForBroadcast(message: ServerMessage): string | Buffer | Uint8Array

  /**
   * Clear any broadcast-related caches.
   */
  clearBroadcastCache(): void

  /**
   * Get a pre-serialized PONG message for efficient heartbeats.
   */
  getPongMessage(): string | Buffer | Uint8Array
}
