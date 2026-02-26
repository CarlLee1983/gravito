<script setup lang="ts">
import { ref } from 'vue'

const container = ref<HTMLElement | null>(null)
const position = ref({ x: 0, y: 0 })
const opacity = ref(0)

const handleMouseMove = (e: MouseEvent) => {
  if (!container.value) {
    return
  }

  const rect = container.value.getBoundingClientRect()
  position.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }
  opacity.value = 1
}

const handleMouseLeave = () => {
  opacity.value = 0
}
</script>

<template>
  <div 
    ref="container"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
    class="relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md group cursor-pointer hover:border-singularity/30 transition-colors duration-300"
  >
    <!-- Spotlight Overlay -->
    <div 
      class="pointer-events-none absolute -inset-px transition-opacity duration-300 z-0"
      :style="{
        opacity: opacity,
        background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(16, 185, 129, 0.1), transparent 40%)`
      }"
    />
    
    <!-- Content -->
    <div class="relative z-10 h-full">
      <slot />
    </div>
  </div>
</template>
