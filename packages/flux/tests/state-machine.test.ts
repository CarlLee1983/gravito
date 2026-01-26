import { describe, expect, it } from 'bun:test'
import { StateMachine } from '../src/core/StateMachine'

describe('StateMachine', () => {
  describe('canTransition()', () => {
    it('should allow pending to running', () => {
      const sm = new StateMachine()
      expect(sm.canTransition('running')).toBe(true)
    })

    it('should forbid pending to completed', () => {
      const sm = new StateMachine()
      expect(sm.canTransition('completed')).toBe(false)
    })

    it('should allow running to suspended', () => {
      const sm = new StateMachine()
      sm.transition('running')
      expect(sm.canTransition('suspended')).toBe(true)
    })

    it('should forbid completed to any status', () => {
      const sm = new StateMachine()
      sm.transition('running')
      sm.transition('completed')
      expect(sm.canTransition('running')).toBe(false)
      expect(sm.canTransition('failed')).toBe(false)
    })
  })

  describe('transition()', () => {
    it('should throw on invalid transition', () => {
      const sm = new StateMachine()
      expect(() => sm.transition('completed')).toThrow('Invalid state transition')
    })

    it('should emit transition event', () => {
      const sm = new StateMachine()
      let detail: any = null
      sm.addEventListener('transition', (e: any) => {
        detail = e.detail
      })
      sm.transition('running')
      expect(detail).toEqual({ from: 'pending', to: 'running' })
    })
  })

  describe('canExecute()', () => {
    it('should return true for pending, paused, suspended', () => {
      const sm = new StateMachine()
      expect(sm.canExecute()).toBe(true)

      sm.forceStatus('paused')
      expect(sm.canExecute()).toBe(true)

      sm.forceStatus('suspended')
      expect(sm.canExecute()).toBe(true)
    })

    it('should return false for running', () => {
      const sm = new StateMachine()
      sm.transition('running')
      expect(sm.canExecute()).toBe(false)
    })
  })

  describe('isTerminal()', () => {
    it('should return true for completed, failed, rolled_back', () => {
      const sm = new StateMachine()

      sm.forceStatus('completed')
      expect(sm.isTerminal()).toBe(true)

      sm.forceStatus('failed')
      expect(sm.isTerminal()).toBe(true)

      sm.forceStatus('rolled_back')
      expect(sm.isTerminal()).toBe(true)
    })
  })
})
