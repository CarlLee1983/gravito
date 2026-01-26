<script setup lang="ts">
import { Image as PrismImage } from '@gravito/prism/vue'

defineProps<{
  src: string
  alt: string
  class?: string
  wrapperClass?: string
  aspectRatio?: string
}>()
</script>

<template>
  <div 
    class="relative overflow-hidden bg-gray-100 dark:bg-gray-800 transition-all duration-500"
    :class="wrapperClass"
    :style="{ aspectRatio: aspectRatio || '1/1' }"
  >
    <!-- Use Prism's optimized Image component -->
    <PrismImage
      :src="src"
      :alt="alt"
      loading="lazy"
      class="w-full h-full object-cover transition-all duration-700 ease-in-out"
      :class="props.class"
      formatNegotiation
      usePicture
      placeholder="blur"
    />
  </div>
</template>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}
</style>
