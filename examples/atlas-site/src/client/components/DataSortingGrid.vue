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
const PARTICLE_COUNT = 120
const CONNECTION_DISTANCE = 180
const MOUSE_RADIUS = 250
const COLOR_PRIMARY = '16, 185, 129' // Emerald 500

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  pulse: number
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
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        size: Math.random() * 3 + 1,
        pulse: Math.random() * Math.PI
      })
    }
  }

  const draw = () => {
    ctx.clearRect(0, 0, width, height)
    
    // 1. Draw Subtle Structural Background Grid
    ctx.beginPath()
    ctx.setLineDash([2, 40])
    ctx.strokeStyle = `rgba(${COLOR_PRIMARY}, 0.05)`
    for(let x = 0; x < width; x += 50) {
      ctx.moveTo(x, 0); ctx.lineTo(x, height)
    }
    for(let y = 0; y < height; y += 50) {
      ctx.moveTo(0, y); ctx.lineTo(width, y)
    }
    ctx.stroke()
    ctx.setLineDash([])

    // 2. Update and draw particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      
      p.x += p.vx
      p.y += p.vy
      p.pulse += 0.02

      // Bounce off walls
      if (p.x < 0 || p.x > width) p.vx *= -1
      if (p.y < 0 || p.y > height) p.vy *= -1

      // Mouse interaction (Stronger push)
      const dx = mouseX - p.x
      const dy = mouseY - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < MOUSE_RADIUS) {
        const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS
        p.x -= dx * force * 0.05
        p.y -= dy * force * 0.05
      }

      // Draw pulsing particle
      const pulseSize = p.size + Math.sin(p.pulse) * 1.5
      const opacity = 0.4 + (Math.sin(p.pulse) * 0.2)
      
      ctx.beginPath()
      ctx.arc(p.x, p.y, pulseSize, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${COLOR_PRIMARY}, ${opacity})`
      ctx.fill()
      
      // Add node glow
      if (p.size > 3) {
        ctx.shadowBlur = 15
        ctx.shadowColor = `rgba(${COLOR_PRIMARY}, 0.5)`
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // Draw connections
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j]
        const dx = p.x - p2.x
        const dy = p.y - p2.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < CONNECTION_DISTANCE) {
          const connOpacity = (1 - dist / CONNECTION_DISTANCE) * 0.4
          ctx.beginPath()
          ctx.lineWidth = dist < 50 ? 1.5 : 0.8
          ctx.strokeStyle = `rgba(${COLOR_PRIMARY}, ${connOpacity})`
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