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
const GRID_SIZE = 40
const PACKET_CHANCE = 0.05 // Slightly increased chance
const MAX_PACKETS = 50
const COLOR_CYAN = '0, 240, 255' // RGB

interface Packet {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  path: {x: number, y: number}[]
  speed: number
}

let packets: Packet[] = []
let width = 0
let height = 0

onMounted(() => {
  if (!canvasRef.value || !containerRef.value) return
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const resize = () => {
    width = canvas.width = containerRef.value?.clientWidth || window.innerWidth
    height = canvas.height = containerRef.value?.clientHeight || window.innerHeight
  }
  
  window.addEventListener('resize', resize)
  resize()

  const spawnPacket = () => {
    if (packets.length >= MAX_PACKETS) return

    // Snap to grid
    const axis = Math.random() > 0.5 ? 'h' : 'v'
    let x, y, vx, vy
    
    // Calculate valid grid indices
    const maxCols = Math.floor(width / GRID_SIZE)
    const maxRows = Math.floor(height / GRID_SIZE)

    if (axis === 'h') {
        // Horizontal: spawn left or right
        const fromLeft = Math.random() > 0.5
        x = fromLeft ? -GRID_SIZE : width + GRID_SIZE
        // Random row index
        y = Math.floor(Math.random() * (maxRows + 1)) * GRID_SIZE
        vx = fromLeft ? 1 : -1
        vy = 0
    } else {
        // Vertical: spawn top or bottom
        const fromTop = Math.random() > 0.5
        // Random col index
        x = Math.floor(Math.random() * (maxCols + 1)) * GRID_SIZE
        y = fromTop ? -GRID_SIZE : height + GRID_SIZE
        vx = 0
        vy = fromTop ? 1 : -1
    }

    packets.push({
      x,
      y,
      vx,
      vy,
      speed: 2 + Math.random() * 3, // Random speed
      life: 0,
      maxLife: 300 + Math.random() * 100, // Longer life to traverse screen
      path: []
    })
  }

  const drawGrid = () => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
    ctx.lineWidth = 1
    ctx.beginPath()

    // Verticals
    for (let x = 0; x <= width; x += GRID_SIZE) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
    }
    // Horizontals
    for (let y = 0; y <= height; y += GRID_SIZE) {
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
    }
    ctx.stroke()
  }

  const updateAndDrawPackets = () => {
    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i]
      
      // Move
      p.x += p.vx * p.speed
      p.y += p.vy * p.speed
      p.life++

      // Record path for trail
      p.path.push({x: p.x, y: p.y})
      if (p.path.length > 25) p.path.shift() // Longer trail

      // Draw Trail
      if (p.path.length > 1) {
        ctx.beginPath()
        ctx.moveTo(p.path[0].x, p.path[0].y)
        for (let j = 1; j < p.path.length; j++) {
            ctx.lineTo(p.path[j].x, p.path[j].y)
        }
        
        // Gradient for trail
        const gradient = ctx.createLinearGradient(
            p.path[0].x, p.path[0].y, 
            p.path[p.path.length-1].x, p.path[p.path.length-1].y
        )
        gradient.addColorStop(0, `rgba(${COLOR_CYAN}, 0)`)
        gradient.addColorStop(1, `rgba(${COLOR_CYAN}, 0.8)`)
        
        ctx.strokeStyle = gradient
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Draw Head
      ctx.fillStyle = `rgba(${COLOR_CYAN}, 1)`
      ctx.shadowBlur = 10
      ctx.shadowColor = `rgba(${COLOR_CYAN}, 0.8)`
      ctx.beginPath()
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      // Remove if out of bounds (extended margin) or dead
      // Margin needs to be > GRID_SIZE to allow spawning and entering
      const MARGIN = GRID_SIZE + 20
      if (
        p.x < -MARGIN || p.x > width + MARGIN || 
        p.y < -MARGIN || p.y > height + MARGIN || 
        p.life > p.maxLife
      ) {
        packets.splice(i, 1)
      }
    }
  }

  const animate = () => {
    ctx.clearRect(0, 0, width, height)
    
    drawGrid()
    
    if (Math.random() < PACKET_CHANCE) {
        spawnPacket()
    }

    updateAndDrawPackets()
    
    animationFrameId = requestAnimationFrame(animate)
  }

  animate()

  onBeforeUnmount(() => {
    window.removeEventListener('resize', resize)
    cancelAnimationFrame(animationFrameId)
  })
})
</script>

<style scoped>
/* No extra styles needed */
</style>