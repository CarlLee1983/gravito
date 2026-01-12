<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
  src: string
  alt: string
  class?: string
  wrapperClass?: string
  aspectRatio?: string
}>()

const isLoaded = ref(false)
const imgRef = ref<HTMLImageElement | null>(null)

const handleLoad = () => {
  isLoaded.value = true
}

onMounted(() => {
  if (imgRef.value?.complete) {
    handleLoad()
  }
})
</script>

<template>
  <div 
    class="relative overflow-hidden bg-gray-100 dark:bg-gray-800 transition-all duration-500"
    :class="wrapperClass"
    :style="{ aspectRatio: aspectRatio || '1/1' }"
  >
    <!-- Placeholder / Skeleton -->
    <div 
      v-if="!isLoaded"
      class="absolute inset-0 flex items-center justify-center animate-pulse"
    >
      <span class="i-heroicons-photo text-gray-300 dark:text-gray-600 text-4xl"></span>
    </div>

    <!-- The Image -->
    <img
      ref="imgRef"
      :src="src"
      :alt="alt"
      loading="lazy"
      class="w-full h-full object-cover transition-all duration-700 ease-in-out"
      :class="[
        props.class,
        isLoaded ? 'opacity-100' : 'opacity-0'
      ]"
      @load="handleLoad"
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
