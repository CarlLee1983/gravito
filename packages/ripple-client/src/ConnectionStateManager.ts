import type { ConnectionState } from './RippleClient'

export class ConnectionStateManager {
  private state: ConnectionState = 'disconnected'
  private listeners = new Set<(state: ConnectionState, prev: ConnectionState) => void>()

  /**
   * Subscribe to state changes.
   *
   * @param callback - Function to execute on state change.
   * @returns Unsubscribe function.
   */
  onStateChange(callback: (state: ConnectionState, prev: ConnectionState) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  /**
   * Update the connection state.
   *
   * @param newState - The new state.
   */
  setState(newState: ConnectionState): void {
    if (this.state === newState) {
      return
    }

    const prev = this.state
    this.state = newState

    for (const listener of this.listeners) {
      listener(newState, prev)
    }
  }

  /**
   * Get current state.
   */
  getState(): ConnectionState {
    return this.state
  }
}
