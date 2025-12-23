<template>
  <div class="sorting-grid absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
    <!-- Abstract Slots -->
    <div class="grid grid-cols-6 lg:grid-cols-12 gap-1 w-full h-full p-4">
      <div v-for="n in 72" :key="n" 
           class="aspect-square border border-white/5 rounded-sm relative flex items-center justify-center">
        <!-- Moving block that "files" into this slot -->
        <div class="organizing-block shadow-[0_0_10px_rgba(0,240,255,0.5)]" 
             v-if="isVisible(n)"
             :style="generateBlockStyle(n)"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const visibleBlocks = ref<number[]>([])

function isVisible(n: number) {
  return visibleBlocks.value.includes(n)
}

function generateBlockStyle(n: number) {
  const delay = Math.random() * 2
  const duration = 1 + Math.random() * 2
  return {
    '--delay': `${delay}s`,
    '--dur': `${duration}s`,
    'animation-delay': `${delay}s`
  }
}

onMounted(() => {
  // Periodically "fill" and "empty" slots to simulate active organizing
  setInterval(() => {
    const count = Math.floor(Math.random() * 5)
    for (let i = 0; i < count; i++) {
        const target = Math.floor(Math.random() * 72)
        if (!visibleBlocks.value.includes(target)) {
            visibleBlocks.value.push(target)
            setTimeout(() => {
                visibleBlocks.value = visibleBlocks.value.filter(id => id !== target)
            }, 3000)
        }
    }
  }, 500)
})
</script>

<style scoped>
.organizing-block {
  width: 80%;
  height: 80%;
  background: rgba(0, 240, 255, 0.4);
  border: 1px solid #00f0ff;
  animation: organize-move var(--dur) ease-out forwards;
}

@keyframes organize-move {
  0% { transform: scale(0.5) translate(20px, 20px); opacity: 0; }
  20% { opacity: 1; }
  80% { transform: scale(1.05) translate(0, 0); }
  100% { transform: scale(1) translate(0, 0); opacity: 0.8; }
}
</style>
