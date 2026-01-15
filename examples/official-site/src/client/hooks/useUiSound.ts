import { useCallback, useEffect, useRef } from 'react'

type SoundType = 'hover' | 'click' | 'open' | 'switch'

export const useUiSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)

  // Initialize Audio Context on first user interaction (browser policy)
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx()
        masterGainRef.current = audioContextRef.current.createGain()
        masterGainRef.current.gain.value = 0.15 // Low volume for subtle UI sounds
        masterGainRef.current.connect(audioContextRef.current.destination)
      }
    } else if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }
  }, [])

  useEffect(() => {
    const handleInteract = () => initAudio()
    window.addEventListener('click', handleInteract)
    window.addEventListener('keydown', handleInteract)
    return () => {
      window.removeEventListener('click', handleInteract)
      window.removeEventListener('keydown', handleInteract)
    }
  }, [initAudio])

  const play = useCallback((type: SoundType) => {
    if (!audioContextRef.current || !masterGainRef.current) {
      return
    }

    const ctx = audioContextRef.current
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(masterGainRef.current)

    const now = ctx.currentTime

    switch (type) {
      case 'hover':
        // High-pitch short blip
        osc.type = 'sine'
        osc.frequency.setValueAtTime(800, now)
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05)
        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(0.3, now + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
        osc.start(now)
        osc.stop(now + 0.06)
        break

      case 'click':
        // Mechanical click (square wave burst)
        osc.type = 'square'
        osc.frequency.setValueAtTime(200, now)
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.1)
        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(0.5, now + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
        osc.start(now)
        osc.stop(now + 0.11)
        break

      case 'switch':
        // Soft swoop
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(400, now)
        osc.frequency.linearRampToValueAtTime(600, now + 0.1)
        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(0.2, now + 0.05)
        gain.gain.linearRampToValueAtTime(0, now + 0.2)
        osc.start(now)
        osc.stop(now + 0.21)
        break

      case 'open':
        // Sci-fi power up
        osc.type = 'sine'
        osc.frequency.setValueAtTime(200, now)
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.3)
        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(0.3, now + 0.1)
        gain.gain.linearRampToValueAtTime(0, now + 0.4)
        osc.start(now)
        osc.stop(now + 0.41)
        break
    }
  }, [])

  return { play }
}
