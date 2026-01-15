<template>
  <div 
    ref="containerRef" 
    class="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-atlas-void"
    :style="containerStyle"
  >
    <canvas ref="canvasRef" class="block w-full h-full opacity-60"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'

const props = defineProps({
  withBackground: {
    type: Boolean,
    default: false
  }
})

const containerRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationFrameId: number

const containerStyle = computed(() => {
  if (!props.withBackground) return {}
  return {
    backgroundImage: "url('/hero-bg.png')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  }
})

// Configuration
const PARTICLE_COUNT = 80
const CONNECTION_DISTANCE = 150
const MOUSE_RADIUS = 200
const COLOR_PRIMARY = '16, 185, 129' // Emerald 500

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
}

let particles: Particle[] = []
let width = 0
let height = 0
let mouseX = -1000
let mouseY = -1000

onMounted(() => {
  if (!canvasRef.value || !containerRef.value) return
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

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
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1
      })
    }
  }

  const draw = () => {
    ctx.clearRect(0, 0, width, height)
    
    // Update and draw particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      
      p.x += p.vx
      p.y += p.vy

      // Bounce off walls
      if (p.x < 0 || p.x > width) p.vx *= -1
      if (p.y < 0 || p.y > height) p.vy *= -1

      // Mouse interaction (subtle push)
      const dx = mouseX - p.x
      const dy = mouseY - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < MOUSE_RADIUS) {
        const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS
        p.x -= dx * force * 0.02
        p.y -= dy * force * 0.02
      }

      // Draw particle
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${COLOR_PRIMARY}, ${0.3 + (p.size / 3)})`
      ctx.fill()

      // Draw connections
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j]
        const dx = p.x - p2.x
        const dy = p.y - p2.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < CONNECTION_DISTANCE) {
          const opacity = (1 - dist / CONNECTION_DISTANCE) * 0.2
          ctx.beginPath()
          ctx.lineWidth = 0.5
          ctx.strokeStyle = `rgba(${COLOR_PRIMARY}, ${opacity})`
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.stroke()
        }
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