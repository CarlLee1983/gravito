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
    // Subtle trail effect instead of clearRect
    ctx.fillStyle = 'rgba(2, 6, 23, 0.15)'
    ctx.fillRect(0, 0, width, height)
    
    // Additive blending for neon glow
    ctx.globalCompositeOperation = 'lighter'

    // 1. Draw Structural Underlay
    ctx.beginPath()
    ctx.setLineDash([1, 100])
    ctx.strokeStyle = `rgba(${COLOR_PRIMARY}, 0.1)`
    for(let x = 0; x < width; x += 100) {
      ctx.moveTo(x, 0); ctx.lineTo(x, height)
    }
    for(let y = 0; y < height; y += 100) {
      ctx.moveTo(0, y); ctx.lineTo(width, y)
    }
    ctx.stroke()
    ctx.setLineDash([])

    // 2. Update and draw particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      
      p.x += p.vx
      p.y += p.vy
      p.pulse += 0.03

      if (p.x < 0 || p.x > width) p.vx *= -1
      if (p.y < 0 || p.y > height) p.vy *= -1

      const dx = mouseX - p.x
      const dy = mouseY - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < MOUSE_RADIUS) {
        const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS
        p.vx -= dx * force * 0.001
        p.vy -= dy * force * 0.001
      }

      // Draw particle core
      const pulseSize = p.size + Math.sin(p.pulse) * 2
      ctx.beginPath()
      ctx.arc(p.x, p.y, pulseSize, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${COLOR_PRIMARY}, 0.8)`
      ctx.fill()
      
      // Draw particle outer glow
      ctx.beginPath()
      ctx.arc(p.x, p.y, pulseSize * 3, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${COLOR_PRIMARY}, 0.1)`
      ctx.fill()

      // 3. Draw high-tension connections
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j]
        const cdx = p.x - p2.x
        const cdy = p.y - p2.y
        const cdist = Math.sqrt(cdx * cdx + cdy * cdy)

        if (cdist < CONNECTION_DISTANCE) {
          const strength = 1 - cdist / CONNECTION_DISTANCE
          ctx.beginPath()
          ctx.lineWidth = strength * 2
          // Pulse the line color
          const alpha = strength * (0.3 + Math.sin(p.pulse) * 0.2)
          ctx.strokeStyle = `rgba(${COLOR_PRIMARY}, ${alpha})`
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.stroke()
          
          // Occasional "Data Sparks" on connections
          if (strength > 0.8 && Math.random() > 0.98) {
            ctx.beginPath()
            ctx.arc(p.x + cdx * 0.5, p.y + cdy * 0.5, 2, 0, Math.PI * 2)
            ctx.fillStyle = '#FFFFFF'
            ctx.fill()
          }
        }
      }
    }
    
    ctx.globalCompositeOperation = 'source-over'
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