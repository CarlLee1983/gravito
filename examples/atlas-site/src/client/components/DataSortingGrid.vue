<template>
  <div 
    ref="containerRef" 
    class="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-atlas-void"
    :style="containerStyle"
  >
    <canvas ref="canvasRef" class="block w-full h-full"></canvas>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  withBackground: {
    type: Boolean,
    default: false,
  },
})

const containerRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationFrameId: number

const containerStyle = computed(() => {
  if (!props.withBackground) {
    return {}
  }
  return {
    backgroundImage: "url('/hero-bg.png')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }
})

// Configuration
const PARTICLE_COUNT = 150
const COLOR_PALETTE = [
  '16, 185, 129', // Emerald 500
  '52, 211, 153', // Emerald 400
  '209, 250, 229', // Mint (High Light)
  '5, 150, 105', // Dark Emerald
]

interface Particle {
  x: number
  y: number
  z: number // Depth layer
  speed: number
  angle: number
  color: string
  size: number
}

let particles: Particle[] = []
let width = 0
let height = 0
let mouseX = -1000
let mouseY = -1000
let time = 0

onMounted(() => {
  if (!canvasRef.value || !containerRef.value) {
    return
  }
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  const resize = () => {
    width = canvas.width = containerRef.value?.clientWidth || window.innerWidth
    height = canvas.height = containerRef.value?.clientHeight || window.innerHeight
    initParticles()
  }

  const handleMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect()
    mouseX = e.clientX - rect.left
    mouseY = e.clientY - rect.top
  }

  const handleMouseLeave = () => {
    mouseX = -1000
    mouseY = -1000
  }

  window.addEventListener('resize', resize)
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseleave', handleMouseLeave)
  resize()

  function initParticles() {
    particles = []
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(createParticle())
    }
  }

  function createParticle(): Particle {
    const z = Math.random() // Depth: 0 (back) to 1 (front)
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      z: z,
      speed: 0.5 + z * 2.5, // Front particles move much faster
      angle: Math.random() * Math.PI * 2,
      color: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
      size: 0.5 + z * 2,
    }
  }

  const draw = () => {
    // 1. Motion Blur Effect (Trails)
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = 'rgba(2, 6, 23, 0.08)'
    ctx.fillRect(0, 0, width, height)

    ctx.globalCompositeOperation = 'lighter'
    time += 0.002

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]

      // 2. Flow Field Logic
      const noise = Math.sin(p.x * 0.005 + time) * Math.cos(p.y * 0.005 + time)
      p.angle = noise * Math.PI * 2

      p.x += Math.cos(p.angle) * p.speed
      p.y += Math.sin(p.angle) * p.speed

      // Mouse Influence
      const dx = mouseX - p.x
      const dy = mouseY - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 300) {
        const force = (300 - dist) / 300
        p.x += (dx / dist) * force * 2
        p.y += (dy / dist) * force * 2
      }

      // Wrap around screen
      if (p.x < -50) {
        p.x = width + 50
      }
      if (p.x > width + 50) {
        p.x = -50
      }
      if (p.y < -50) {
        p.y = height + 50
      }
      if (p.y > height + 50) {
        p.y = -50
      }

      // 3. Render High-Quality "Glow Stream"
      const alpha = 0.1 + p.z * 0.6
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${p.color}, ${alpha})`
      ctx.fill()

      if (p.z > 0.8) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.fill()
      }
    }

    animationFrameId = requestAnimationFrame(draw)
  }

  draw()

  onBeforeUnmount(() => {
    window.removeEventListener('resize', resize)
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseleave', handleMouseLeave)
    cancelAnimationFrame(animationFrameId)
  })
})
</script>

<style scoped>
/* Ensure the container is truly void-like */
.bg-atlas-void {
  background-color: #020617;
}
</style>
