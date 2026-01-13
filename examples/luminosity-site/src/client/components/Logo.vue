<script setup lang="ts">
// Luminosity Logo with Singularity Glow
defineProps<{
  size?: 'sm' | 'md' | 'lg'
}>()
</script>

<template>
  <div class="flex items-center gap-3">
    <div 
      class="relative group"
      :class="{
        'w-8 h-8': !size || size === 'sm',
        'w-10 h-10': size === 'md',
        'w-12 h-12': size === 'lg'
      }"
    >
      <!-- Glow Effect -->
      <div 
        class="absolute inset-0 bg-singularity/50 rounded-lg blur-lg group-hover:blur-xl transition-all duration-500"
      ></div>
      
      <!-- Primary Block -->
      <div 
        class="relative w-full h-full rounded-lg bg-gradient-to-tr from-cyan-600 to-singularity flex items-center justify-center overflow-hidden border border-white/20 shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-transform duration-500 group-hover:scale-110"
      >
        <!-- The "L" Void -->
        <div class="w-1/2 h-1/2 rounded-full bg-void shadow-inner flex items-center justify-center">
            <div class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
        </div>
      </div>
    </div>
    
    <span class="font-black tracking-tighter text-xl hidden sm:block text-white">
      LUMINOSITY
    </span>
  </div>
</template>