<template>
  <div ref="containerRef" class="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-atlas-void">
    <canvas ref="canvasRef" class="block w-full h-full opacity-60"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const containerRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationFrameId: number

// Configuration
const STAR_COUNT = 150
const COLOR_CYAN = '0, 240, 255'
const BASE_SPEED = 0.015
const WARP_SPEED = 0.05
const FLOW_FIELD_STRENGTH = 0.15

interface Star {
  x: number // -1 to 1 (normalized space)
  y: number // -1 to 1
  z: number // 0 to 1 (depth)
  prevZ: number
  size: number
  color: string
  speedOffset: number
}

let stars: Star[] = []
let width = 0
let height = 0
let centerX = 0
let centerY = 0
let mouseX = 0
let mouseY = 0
let currentSpeed = BASE_SPEED

onMounted(() => {
  if (!canvasRef.value || !containerRef.value) return
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const resize = () => {
    width = canvas.width = containerRef.value?.clientWidth || window.innerWidth
    height = canvas.height = containerRef.value?.clientHeight || window.innerHeight
    centerX = width / 2
    centerY = height / 2
  }
  
  const handleMouseMove = (e: MouseEvent) => {
    // Subtle parallax offset based on mouse position
    mouseX = (e.clientX - centerX) / centerX * 50
    mouseY = (e.clientY - centerY) / centerY * 50
  }

  window.addEventListener('resize', resize)
  window.addEventListener('mousemove', handleMouseMove)
  resize()

  const initStars = () => {
    stars = []
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push(createStar())
    }
  }

  const createStar = (initial = false): Star => {
    return {
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: initial ? Math.random() : 1, // Random depth if initial, else spawn at back
      prevZ: 1,
      size: 0.5 + Math.random() * 2,
      color: Math.random() > 0.8 ? '255, 255, 255' : COLOR_CYAN,
      speedOffset: Math.random() * 0.005 // Varied speed per star
    }
  }

  initStars()

  const draw = () => {
    ctx.clearRect(0, 0, width, height)
    
    // Smooth speed transition (could be hooked to scroll in future)
    currentSpeed += (BASE_SPEED - currentSpeed) * 0.1

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i]
      s.prevZ = s.z
      s.z -= (currentSpeed + s.speedOffset)

      // Add a simple "flow field" effect by slightly shifting x/y based on time/position
      const noise = Math.sin(Date.now() * 0.001 + s.x * 5) * FLOW_FIELD_STRENGTH
      s.x += noise * 0.001
      s.y += Math.cos(Date.now() * 0.001 + s.y * 5) * 0.0005

      // Reset star if it passes the camera (z <= 0)
      if (s.z <= 0) {
        Object.assign(s, createStar())
        s.prevZ = s.z
      }

      // Project 3D to 2D
      const x = (s.x * width / s.z) + centerX + mouseX
      const y = (s.y * height / s.z) + centerY + mouseY
      
      const px = (s.x * width / s.prevZ) + centerX + mouseX
      const py = (s.y * height / s.prevZ) + centerY + mouseY

      // Don't draw if outside screen
      if (x < 0 || x > width || y < 0 || y > height) continue

      // Calculate opacity and size based on depth
      const opacity = Math.min(1, (1 - s.z) * 1.5)
      const size = (1 - s.z) * s.size * 2

      // Draw Streak (Motion Blur)
      ctx.beginPath()
      ctx.lineWidth = size
      ctx.lineCap = 'round'
      ctx.strokeStyle = `rgba(${s.color}, ${opacity * 0.5})`
      ctx.moveTo(px, py)
      ctx.lineTo(x, y)
      ctx.stroke()

      // Draw Head (Glow)
      if (s.z < 0.5) {
        ctx.beginPath()
        ctx.fillStyle = `rgba(${s.color}, ${opacity})`
        ctx.arc(x, y, size / 2, 0, Math.PI * 2)
        ctx.fill()
        
        // Add subtle glow for closer particles
        if (s.z < 0.2) {
            ctx.shadowBlur = 15 * (1 - s.z)
            ctx.shadowColor = `rgba(${s.color}, 0.8)`
            ctx.fill()
            ctx.shadowBlur = 0
        }
      }
    }

    animationFrameId = requestAnimationFrame(draw)
  }

  draw()

  onBeforeUnmount(() => {
    window.removeEventListener('resize', resize)
    window.removeEventListener('mousemove', handleMouseMove)
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